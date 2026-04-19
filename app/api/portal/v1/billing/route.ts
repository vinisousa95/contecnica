import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Get all projects for this client
  const projects = await prisma.project.findMany({
    where: { clientId: session.clientId },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  // Fetch all material expenses across all client projects
  const expenses = await prisma.expense.findMany({
    where: {
      projectId: { in: projectIds },
      category: { name: { contains: "material", mode: "insensitive" } },
    },
    include: { category: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  const pending = expenses.filter((e) => e.status === "PENDING" || e.status === "OVERDUE");
  const paid = expenses.filter((e) => e.status === "PAID");

  const totalPending = pending.reduce((s, e) => s + Number(e.amount), 0);
  const totalPaid = paid.reduce((s, e) => s + Number(e.amount), 0);

  const mapExpense = (e: typeof expenses[0]) => ({
    id: e.id,
    description: e.description,
    category: e.category?.name ?? "Material",
    projectId: e.projectId,
    projectName: e.projectId ? projectMap[e.projectId] : null,
    amount: Number(e.amount),
    dueDate: e.dueDate,
    status: e.status,
    isOverdue: e.status === "OVERDUE" || (e.status === "PENDING" && new Date(e.dueDate) < new Date()),
  });

  return apiSuccess({
    summary: { totalPending, totalPaid, count: pending.length },
    pending: pending.map(mapExpense),
    paid: paid.map(mapExpense),
  });
}
