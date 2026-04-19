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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    include: {
      expenses: {
        where: { visibleInPortal: true },
        select: { amount: true, status: true },
      },
      revenues: {
        select: { amount: true, status: true },
      },
      _count: {
        select: { updates: true, photos: true, documents: true },
      },
    },
  });

  if (!project) return apiError("Obra não encontrada", 404);

  const totalExpenses = project.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalReceived = project.revenues
    .filter((r) => r.status === "RECEIVED")
    .reduce((s, r) => s + Number(r.amount), 0);

  return apiSuccess({
    id: project.id,
    name: project.name,
    status: project.status,
    statusLabel: STATUS_LABELS[project.status] ?? project.status,
    progress: project.progress,
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate,
    actualEndDate: project.actualEndDate,
    budget: project.budget ? Number(project.budget) : null,
    description: project.description,
    notes: project.notes,
    street: project.street,
    number: project.number,
    complement: project.complement,
    neighborhood: project.neighborhood,
    city: project.city,
    state: project.state,
    zipCode: project.zipCode,
    totalExpenses,
    totalReceived,
    remaining: project.budget ? Number(project.budget) - totalExpenses : null,
    counts: project._count,
  });
}
