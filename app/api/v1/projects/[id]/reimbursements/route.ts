import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

/**
 * Reembolso de materiais de uma obra.
 *
 * Lista as despesas da obra e permite enviá-las para a cobrança do cliente,
 * liberando ou não a nota fiscal junto. É a decisão explícita que antes não
 * existia: o portal cobrava todo material cuja categoria tivesse "material" no
 * nome, e ignorava o resto.
 *
 * Uma despesa já reembolsada (`clientPaid`) não é alterada por aqui — desfazer
 * um reembolso pago é operação de correção, não de rotina.
 *
 * DIÁRIAS FICAM DE FORA. Mão de obra é custo da Contécnica, não do cliente. A
 * exclusão usa o vínculo com o apontamento (`workAssignment`), que é como a
 * diária nasce em app/api/v1/assignments/route.ts — e não o nome da categoria,
 * que é justamente o critério frágil que esta tela veio substituir. Uma obra com
 * vários funcionários gera uma diária por dia por pessoa; sem esse filtro, a
 * lista viraria só diária.
 */

/** Despesa que pode ser cobrada do cliente: qualquer uma que não seja diária. */
const NAO_E_DIARIA = { workAssignment: { is: null } } as const;

const patchSchema = z
  .object({
    expenseIds: z.array(z.string().min(1)).min(1, "Selecione ao menos uma despesa").max(200),
    /** true = enviar para cobrança; false = retirar da cobrança. */
    billedToClient: z.boolean().optional(),
    /** true = liberar a nota fiscal para o cliente. */
    receiptShared: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.billedToClient !== undefined || d.receiptShared !== undefined, {
    message: "Informe billedToClient e/ou receiptShared",
  });

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const expenses = await prisma.expense.findMany({
    where: {
      projectId: params.id,
      // `billedToClient: true` continua aparecendo mesmo se for diária: se alguma
      // foi enviada antes deste filtro existir, ela precisa ficar visível para
      // poder ser retirada — esconder algo que está sendo cobrado seria pior.
      OR: [NAO_E_DIARIA, { billedToClient: true }],
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: "desc" }],
  });

  return apiSuccess(
    expenses.map((e) => ({
      id: e.id,
      description: e.description,
      supplier: e.supplier,
      category: e.category?.name ?? null,
      amount: Number(e.amount),
      dueDate: e.dueDate,
      status: e.status,
      hasReceipt: !!e.attachmentUrl,
      attachmentUrl: e.attachmentUrl,
      billedToClient: e.billedToClient,
      billedToClientAt: e.billedToClientAt,
      receiptShared: e.receiptShared,
      clientPaid: e.clientPaid,
      clientPaidAt: e.clientPaidAt,
    }))
  );
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const parsed = await validateBody(request, patchSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const { expenseIds, billedToClient, receiptShared } = parsed.data;

  // Restringe à obra da URL: sem isto, um id de despesa de outra obra passaria.
  const target = await prisma.expense.findMany({
    where: {
      id: { in: expenseIds },
      projectId: params.id,
      clientPaid: false,
      // Diária nunca pode ser ENVIADA para cobrança, nem por requisição forjada.
      // Retirar e mexer na nota seguem permitidos, para corrigir dado antigo.
      ...(billedToClient === true ? NAO_E_DIARIA : {}),
    },
    select: { id: true, attachmentUrl: true },
  });

  if (target.length === 0) {
    return apiError(
      billedToClient === true
        ? "Nenhuma despesa elegível — diárias não podem ser cobradas do cliente"
        : "Nenhuma despesa elegível — verifique se já foi reembolsada",
      400
    );
  }

  const data: Record<string, unknown> = {};

  if (billedToClient !== undefined) {
    data.billedToClient = billedToClient;
    data.billedToClientAt = billedToClient ? new Date() : null;
    // Retirar da cobrança também recolhe a nota: ela só existe ali para
    // justificar o valor cobrado.
    if (!billedToClient) data.receiptShared = false;
  }

  if (receiptShared !== undefined) data.receiptShared = receiptShared;

  await prisma.expense.updateMany({ where: { id: { in: target.map((t) => t.id) } }, data });

  // Sem anexo não há o que liberar — avisa em vez de deixar o usuário achando
  // que a nota foi enviada.
  const semNota = receiptShared ? target.filter((t) => !t.attachmentUrl).length : 0;

  return apiSuccess({
    updated: target.length,
    ignored: expenseIds.length - target.length,
    withoutReceipt: semNota,
  });
}
