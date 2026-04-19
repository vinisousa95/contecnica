import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const EXPENSE_STATUS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
};

const REVENUE_STATUS: Record<string, string> = {
  PENDING: "Pendente",
  RECEIVED: "Recebido",
  OVERDUE: "Vencido",
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    select: { id: true, budget: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  const [expenses, revenues] = await Promise.all([
    prisma.expense.findMany({
      where: { projectId: params.id },
      include: { category: { select: { name: true } } },
      orderBy: { dueDate: "desc" },
    }),
    prisma.revenue.findMany({
      where: { projectId: params.id },
      orderBy: { dueDate: "desc" },
    }),
  ]);

  // Filter visible expenses in JS — safe even if column not yet in DB (defaults to showing all)
  const visibleExpenses = expenses.filter((e: any) => e.visibleInPortal !== false);

  const totalExpenses = visibleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalReceived = revenues
    .filter((r) => r.status === "RECEIVED")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalPending = revenues
    .filter((r) => r.status === "PENDING")
    .reduce((s, r) => s + Number(r.amount), 0);

  return apiSuccess({
    summary: {
      budget: project.budget ? Number(project.budget) : null,
      totalExpenses,
      totalReceived,
      totalPending,
      balance: totalReceived - totalExpenses,
    },
    expenses: visibleExpenses.map((e: any) => ({
      id: e.id,
      description: e.description,
      category: e.category?.name ?? "—",
      amount: Number(e.amount),
      dueDate: e.dueDate,
      paymentDate: e.paymentDate,
      status: e.status,
      statusLabel: EXPENSE_STATUS[e.status] ?? e.status,
      attachmentUrl: e.attachmentUrl,
    })),
    revenues: revenues.map((r) => ({
      id: r.id,
      description: r.description,
      amount: Number(r.amount),
      dueDate: r.dueDate,
      receivedDate: r.receivedDate,
      status: r.status,
      statusLabel: REVENUE_STATUS[r.status] ?? r.status,
    })),
  });
}
