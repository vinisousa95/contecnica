import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// GET: list approved budgets for this project's client
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { clientId: true, linkedBudgetId: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  const budgets = await prisma.budget.findMany({
    where: { clientId: project.clientId, status: "APPROVED" },
    select: { id: true, code: true, title: true, totalAmount: true },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ budgets, linkedBudgetId: project.linkedBudgetId });
}
