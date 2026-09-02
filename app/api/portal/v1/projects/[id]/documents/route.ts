import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contrato",
  BUDGET: "Orçamento",
  INVOICE: "Nota Fiscal",
  REPORT: "Relatório",
  OTHER: "Outro",
};

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    select: { id: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  // Documentos cadastrados na obra + notas fiscais liberadas ao cliente.
  //
  // As notas não viram registro próprio: continuam sendo o anexo da despesa
  // (fonte única). Listamos aqui as que foram compartilhadas na aba de reembolso
  // (receiptShared), então liberar/retirar a nota reflete nos dois lugares —
  // Cobranças e Documentos — sem risco de ficar dessincronizado.
  const [documents, notas] = await Promise.all([
    prisma.projectDocument.findMany({
      where: { projectId: params.id, visible: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: {
        projectId: params.id,
        receiptShared: true,
        attachmentUrl: { not: null },
      },
      select: {
        id: true,
        description: true,
        attachmentUrl: true,
        billedToClientAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const docList = documents.map((d) => ({
    id: d.id,
    name: d.name,
    fileUrl: d.fileUrl,
    type: d.type,
    typeLabel: TYPE_LABELS[d.type] ?? d.type,
    createdAt: d.createdAt,
  }));

  // Evita listar duas vezes caso um documento já aponte para o mesmo arquivo.
  const jaListados = new Set(docList.map((d) => d.fileUrl));

  const notaList = notas
    .filter((n) => n.attachmentUrl && !jaListados.has(n.attachmentUrl))
    .map((n) => ({
      id: `nota-${n.id}`,
      name: n.description || "Nota fiscal",
      fileUrl: n.attachmentUrl as string,
      type: "INVOICE",
      typeLabel: TYPE_LABELS.INVOICE,
      // "Adicionado em": quando a despesa entrou na cobrança, ou a criação dela.
      createdAt: n.billedToClientAt ?? n.createdAt,
    }));

  const all = [...docList, ...notaList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return apiSuccess(all);
}
