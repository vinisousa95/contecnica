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

  const documents = await prisma.projectDocument.findMany({
    where: { projectId: params.id, visible: true },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(
    documents.map((d) => ({ ...d, typeLabel: TYPE_LABELS[d.type] ?? d.type }))
  );
}
