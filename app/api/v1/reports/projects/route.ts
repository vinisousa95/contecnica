import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { projectFinancials, marginPercent } from "@/lib/project-financials";
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
    const fin = projectFinancials(p.expenses, p.revenues);
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
      ...fin,
      budgetVariance: budget ? budget - fin.totalExpenses : null,
      budgetUsedPercent: budget ? Math.round((fin.totalExpenses / budget) * 100) : null,
      // Percentual sobre o RECEBIDO: mostrar margem percentual de dinheiro que
      // ainda não entrou é o mesmo erro que a margem tinha.
      realizedMarginPercent: marginPercent(fin.realizedMargin, fin.receivedRevenues),
      projectedMarginPercent: marginPercent(fin.projectedMargin, fin.totalRevenues),
    };
  });

  return apiSuccess(enriched);
}
