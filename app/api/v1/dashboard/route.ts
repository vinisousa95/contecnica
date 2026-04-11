import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { startOfMonth, endOfMonth, addDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const alertDate = addDays(now, 7);

  const [
    projectCounts,
    expenseSummary,
    revenueSummary,
    overdueExpenses,
    overdueRevenues,
    upcomingExpenses,
    upcomingRevenues,
    monthExpenses,
    monthRevenues,
    recentExpenses,
    recentRevenues,
    projectsWithFinancials,
    budgetCounts,
    recentBudgets,
  ] = await Promise.all([
    // Project counts
    prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Total expenses pending
    prisma.expense.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Total revenues pending
    prisma.revenue.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Overdue expenses
    prisma.expense.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Overdue revenues
    prisma.revenue.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Upcoming expenses (next 7 days)
    prisma.expense.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: now, lte: alertDate },
      },
      include: { project: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // Upcoming revenues (next 7 days)
    prisma.revenue.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: now, lte: alertDate },
      },
      include: { project: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // Month expenses (paid this month)
    prisma.expense.aggregate({
      where: {
        status: "PAID",
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Month revenues (received this month)
    prisma.revenue.aggregate({
      where: {
        status: "RECEIVED",
        receivedDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Recent expenses
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        project: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),

    // Recent revenues
    prisma.revenue.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        project: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),

    // Projects with financials (in progress)
    prisma.project.findMany({
      where: { status: "IN_PROGRESS" },
      include: {
        client: { select: { name: true } },
        _count: { select: { expenses: true, revenues: true } },
        expenses: { select: { amount: true, status: true } },
        revenues: { select: { amount: true, status: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),

    // Budget counts by status
    prisma.budget.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalAmount: true },
    }),

    // Recent budgets
    prisma.budget.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        tier: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  // Calculate project counts
  const statusCounts = Object.fromEntries(
    projectCounts.map((g) => [g.status, g._count.id])
  );

  // Calculate project financials
  const projectsData = projectsWithFinancials.map((p) => {
    const totalExpenses = p.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenues = p.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    return {
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      status: p.status,
      budget: p.budget ? Number(p.budget) : null,
      totalExpenses,
      totalRevenues,
      margin: totalRevenues - totalExpenses,
    };
  });

  // Cash flow
  const monthIncome = Number(monthRevenues._sum.amount ?? 0);
  const monthOutflow = Number(monthExpenses._sum.amount ?? 0);

  const data = {
    projects: {
      inProgress: statusCounts["IN_PROGRESS"] ?? 0,
      planning: statusCounts["PLANNING"] ?? 0,
      completed: statusCounts["COMPLETED"] ?? 0,
      paused: statusCounts["PAUSED"] ?? 0,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    },
    financial: {
      payable: {
        total: Number(expenseSummary._sum.amount ?? 0),
        count: expenseSummary._count.id,
      },
      receivable: {
        total: Number(revenueSummary._sum.amount ?? 0),
        count: revenueSummary._count.id,
      },
      overdueExpenses: {
        total: Number(overdueExpenses._sum.amount ?? 0),
        count: overdueExpenses._count.id,
      },
      overdueRevenues: {
        total: Number(overdueRevenues._sum.amount ?? 0),
        count: overdueRevenues._count.id,
      },
      monthIncome,
      monthOutflow,
      monthBalance: monthIncome - monthOutflow,
    },
    alerts: {
      upcomingExpenses: upcomingExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        dueDate: e.dueDate,
        projectName: e.project?.name,
        categoryName: e.category?.name,
      })),
      upcomingRevenues: upcomingRevenues.map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        dueDate: r.dueDate,
        projectName: r.project?.name,
        clientName: r.client?.name,
      })),
    },
    recentMovements: {
      expenses: recentExpenses.map((e) => ({
        id: e.id,
        type: "expense",
        description: e.description,
        amount: Number(e.amount),
        status: e.status,
        date: e.createdAt,
        projectName: e.project?.name,
        categoryName: e.category?.name,
      })),
      revenues: recentRevenues.map((r) => ({
        id: r.id,
        type: "revenue",
        description: r.description,
        amount: Number(r.amount),
        status: r.status,
        date: r.createdAt,
        projectName: r.project?.name,
        clientName: r.client?.name,
      })),
    },
    activeProjects: projectsData,
    budgets: {
      draft: budgetCounts.find((b) => b.status === "DRAFT")?._count.id ?? 0,
      underReview: budgetCounts.find((b) => b.status === "UNDER_REVIEW")?._count.id ?? 0,
      sent: budgetCounts.find((b) => b.status === "SENT")?._count.id ?? 0,
      approved: budgetCounts.find((b) => b.status === "APPROVED")?._count.id ?? 0,
      total: budgetCounts.reduce((s, b) => s + b._count.id, 0),
      approvedTotal: Number(
        budgetCounts.find((b) => b.status === "APPROVED")?._sum.totalAmount ?? 0
      ),
      sentTotal: Number(
        budgetCounts.find((b) => b.status === "SENT")?._sum.totalAmount ?? 0
      ),
    },
    recentBudgets: recentBudgets.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      status: b.status,
      tier: b.tier,
      totalAmount: Number(b.totalAmount),
      clientName: b.client?.name,
      createdAt: b.createdAt,
    })),
  };

  return apiSuccess(data);
}
