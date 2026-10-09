import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { getBalanceFor } from "@/lib/advances";

// POST /api/v1/assignments/[id]/apply-advance
// Quita a diária do apontamento usando o saldo de adiantamento do funcionário:
// marca a despesa como PAGA (via adiantamento) e consome o saldo.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const a = await prisma.workAssignment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      employeeId: true,
      advanceApplied: true,
      expense: { select: { id: true, amount: true } },
    },
  });
  if (!a) return apiError("Registro não encontrado", 404);
  if (a.advanceApplied) return apiError("Esta diária já foi abatida do adiantamento", 400);
  if (!a.expense) return apiError("Gere a diária antes de abater do adiantamento", 400);

  const valor = Number(a.expense.amount);
  const saldo = await getBalanceFor(a.employeeId);
  if (saldo + 0.001 < valor) {
    return apiError(
      `Saldo de adiantamento insuficiente (R$ ${saldo.toFixed(2)}) para esta diária (R$ ${valor.toFixed(2)})`,
      400
    );
  }

  await prisma.$transaction([
    prisma.workAssignment.update({ where: { id: a.id }, data: { advanceApplied: true } }),
    prisma.expense.update({
      where: { id: a.expense.id },
      data: { status: "PAID", paymentDate: new Date(), paymentMethod: "Adiantamento" },
    }),
  ]);

  return apiSuccess({ ok: true });
}
