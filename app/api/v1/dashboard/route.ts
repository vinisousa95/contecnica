import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { projectFinancials } from "@/lib/project-financials";
import { apiSuccess, apiError } from "@/lib/utils";
import { startOfMonth, endOfMonth, addDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const now = new Date();

  // Mês exibido: ?month=YYYY-MM. Sem o parâmetro (ou com valor inválido), o mês
  // corrente. A validação precisa checar o INTERVALO, não só o formato: `new
  // Date(2026, 12, 1)` rola para janeiro de 2027 em silêncio, e um ano absurdo
  // gera uma data que o banco recusa e derruba a rota.
  const monthParam = new URL(request.url).searchParams.get("month");
  const m = monthParam?.match(/^(\d{4})-(\d{2})$/);
  let validReference = now;

  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      validReference = new Date(year, month - 1, 1, 12);
    }
  }

  const monthStart = startOfMonth(validReference);
  const monthEnd = endOfMonth(validReference);

  // Alertas seguem ancorados em HOJE, não no mês escolhido: "próximos 7 dias"
  // só faz sentido a partir de agora, mesmo olhando um mês passado.
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

    // Últimas movimentações: só o que o dinheiro de fato movimentou.
    //
    // Antes vinham as 5 mais recentes por createdAt, sem filtro de status: uma
    // receita agendada para o mês seguinte aparecia como "+R$ X" ao lado das
    // recebidas, como se tivesse entrado. O que está por vir tem lugar próprio
    // (upcomingExpenses / upcomingRevenues e os vencidos).
    //
    // A ordem é pela data do pagamento/recebimento, não pela do lançamento —
    // lançar hoje uma despesa paga no mês passado não a torna a mais recente.
    prisma.expense.findMany({
      where: { status: "PAID" },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        project: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),

    prisma.revenue.findMany({
      where: { status: "RECEIVED" },
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
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
    return {
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      status: p.status,
      budget: p.budget ? Number(p.budget) : null,
      ...projectFinancials(p.expenses, p.revenues),
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
        date: e.paymentDate ?? e.createdAt,
        projectName: e.project?.name,
        categoryName: e.category?.name,
      })),
      revenues: recentRevenues.map((r) => ({
        id: r.id,
        type: "revenue",
        description: r.description,
        amount: Number(r.amount),
        status: r.status,
        date: r.receivedDate ?? r.createdAt,
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

  // Meses oferecidos no seletor: do primeiro lançamento registrado até o mês
  // corrente. Evita listar meses vazios de antes de a empresa ter movimento.
  const [firstExpense, firstRevenue] = await Promise.all([
    prisma.expense.findFirst({ orderBy: { dueDate: "asc" }, select: { dueDate: true } }),
    prisma.revenue.findFirst({ orderBy: { dueDate: "asc" }, select: { dueDate: true } }),
  ]);

  const candidates = [firstExpense?.dueDate, firstRevenue?.dueDate].filter(Boolean) as Date[];
  // Sem lançamento nenhum, oferece só o mês corrente.
  const earliest = candidates.length
    ? new Date(Math.min(...candidates.map((d) => d.getTime())))
    : now;

  const availableMonths: string[] = [];
  const cursor = startOfMonth(earliest);
  const last = startOfMonth(now);
  // Se o mês escolhido for além do corrente (ou anterior ao primeiro), ainda
  // aparece na lista, para o seletor nunca ficar sem a opção selecionada.
  const selected = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  for (let d = cursor; d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    availableMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  if (!availableMonths.includes(selected)) availableMonths.push(selected);

  return apiSuccess({
    ...data,
    // Mais recente primeiro: é o que o usuário costuma querer.
    availableMonths: availableMonths.sort().reverse(),
    selectedMonth: selected,
  });
}
