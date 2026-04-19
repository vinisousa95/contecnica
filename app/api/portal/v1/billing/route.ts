import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const projects = await prisma.project.findMany({
    where: { clientId: session.clientId },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  // Fetch ALL material expenses — admin "PAID" means admin paid the supplier,
  // NOT that the client reimbursed. All appear as pending reimbursement until
  // a future gateway integration marks clientPaid = true.
  const expenses = await prisma.expense.findMany({
    where: {
      projectId: { in: projectIds },
      category: { name: { contains: "material", mode: "insensitive" } },
    },
    include: { category: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  // Fetch ACCEPTED extra services — client has approved, awaiting payment
  const extraServices = await prisma.extraService.findMany({
    where: {
      projectId: { in: projectIds },
      status: "ACCEPTED",
    },
    orderBy: { acceptedAt: "asc" },
  });

  const mapExpense = (e: typeof expenses[0]) => ({
    id: e.id,
    type: "material" as const,
    description: e.description,
    category: e.category?.name ?? "Material",
    projectId: e.projectId,
    projectName: e.projectId ? projectMap[e.projectId] : null,
    amount: Number(e.amount),
    dueDate: e.dueDate,
    attachmentUrl: e.attachmentUrl ?? null,
    isOverdue: new Date(e.dueDate) < new Date(),
  });

  const mapExtraService = (s: typeof extraServices[0]) => ({
    id: s.id,
    type: "extra_service" as const,
    description: s.name,
    category: "Serviço Extra",
    projectId: s.projectId,
    projectName: projectMap[s.projectId] ?? null,
    amount: Number(s.amount),
    dueDate: s.acceptedAt ?? s.createdAt,
    attachmentUrl: null,
    isOverdue: false,
  });

  const allPending = [
    ...expenses.map(mapExpense),
    ...extraServices.map(mapExtraService),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const totalPending = allPending.reduce((s, e) => s + e.amount, 0);

  return apiSuccess({
    summary: { totalPending, count: allPending.length },
    pending: allPending,
  });
}
