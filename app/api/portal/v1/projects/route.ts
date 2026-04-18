import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em Andamento",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const projects = await prisma.project.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      startDate: true,
      expectedEndDate: true,
      actualEndDate: true,
      budget: true,
      description: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  return apiSuccess(
    projects.map((p) => ({
      ...p,
      statusLabel: STATUS_LABELS[p.status] ?? p.status,
      budget: p.budget ? Number(p.budget) : null,
    }))
  );
}
