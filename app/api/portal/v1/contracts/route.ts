import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  SIGNED: "Assinado",
  CANCELLED: "Cancelado",
};

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const contracts = await prisma.contract.findMany({
    where: {
      clientId: session.clientId,
      status: { in: ["SENT", "SIGNED"] },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(
    contracts.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      status: c.status,
      statusLabel: STATUS_LABELS[c.status] ?? c.status,
      projectId: c.projectId,
      projectName: c.project?.name ?? null,
      totalAmount: Number(c.totalAmount),
      sentAt: c.sentAt,
      signedAt: c.signedAt,
      signedFileUrl: c.signedFileUrl,
      createdAt: c.createdAt,
    }))
  );
}
