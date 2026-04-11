import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : startOfMonth(new Date());
  const to = toParam ? new Date(toParam) : endOfMonth(new Date());

  const [expenses, revenues] = await Promise.all([
    prisma.expense.findMany({
      where: {
        status: "PAID",
        paymentDate: { gte: from, lte: to },
      },
      include: { category: { select: { name: true } } },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.revenue.findMany({
      where: {
        status: "RECEIVED",
        receivedDate: { gte: from, lte: to },
      },
      include: { category: { select: { name: true } } },
      orderBy: { receivedDate: "asc" },
    }),
  ]);

  // Daily aggregation
  const days = eachDayOfInterval({ start: from, end: to });

  const dailyData = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    const dayExpenses = expenses.filter(
      (e) => e.paymentDate && format(new Date(e.paymentDate), "yyyy-MM-dd") === dayStr
    );
    const dayRevenues = revenues.filter(
      (r) => r.receivedDate && format(new Date(r.receivedDate), "yyyy-MM-dd") === dayStr
    );

    const outflow = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const inflow = dayRevenues.reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      date: dayStr,
      inflow,
      outflow,
      balance: inflow - outflow,
    };
  });

  // Running balance
  let running = 0;
  const withRunning = dailyData.map((d) => {
    running += d.balance;
    return { ...d, runningBalance: running };
  });

  // Summary by category
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category?.name ?? "Sem categoria";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
  }

  const revenueByCategory: Record<string, number> = {};
  for (const r of revenues) {
    const cat = r.category?.name ?? "Sem categoria";
    revenueByCategory[cat] = (revenueByCategory[cat] ?? 0) + Number(r.amount);
  }

  const totalInflow = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOutflow = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return apiSuccess({
    period: { from, to },
    summary: {
      totalInflow,
      totalOutflow,
      balance: totalInflow - totalOutflow,
    },
    daily: withRunning,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, total]) => ({
      name,
      total,
    })),
    revenueByCategory: Object.entries(revenueByCategory).map(([name, total]) => ({
      name,
      total,
    })),
    transactions: {
      expenses: expenses.map((e) => ({
        id: e.id,
        type: "expense",
        description: e.description,
        amount: Number(e.amount),
        date: e.paymentDate,
        category: e.category?.name,
      })),
      revenues: revenues.map((r) => ({
        id: r.id,
        type: "revenue",
        description: r.description,
        amount: Number(r.amount),
        date: r.receivedDate,
        category: r.category?.name,
      })),
    },
  });
}
