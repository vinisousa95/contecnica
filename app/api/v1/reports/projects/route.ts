import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const clientId = searchParams.get("clientId") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      expenses: { select: { amount: true, status: true, categoryId: true } },
      revenues: { select: { amount: true, status: true } },
    },
  });

  const enriched = projects.map((p) => {
    const totalExpenses = p.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const paidExpenses = p.expenses
      .filter((e) => e.status === "PAID")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenues = p.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    const receivedRevenues = p.revenues
      .filter((r) => r.status === "RECEIVED")
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const budget = p.budget ? Number(p.budget) : null;

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      clientName: p.client.name,
      startDate: p.startDate,
      expectedEndDate: p.expectedEndDate,
      actualEndDate: p.actualEndDate,
      budget,
      totalExpenses,
      paidExpenses,
      totalRevenues,
      receivedRevenues,
      margin: totalRevenues - totalExpenses,
      budgetVariance: budget ? budget - totalExpenses : null,
      budgetUsedPercent: budget ? Math.round((totalExpenses / budget) * 100) : null,
      marginPercent: totalRevenues > 0 ? Math.round(((totalRevenues - totalExpenses) / totalRevenues) * 100) : 0,
    };
  });

  return apiSuccess(enriched);
}
