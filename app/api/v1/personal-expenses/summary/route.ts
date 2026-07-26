import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  const [allCurrentMonth, byCategory, recentOverdue] = await Promise.all([
    prisma.personalExpense.findMany({
      where: {
        createdById: session.userId,
        expenseDate: { gte: startOfMonth, lt: endOfMonth },
      },
      select: { amount: true, status: true },
    }),
    prisma.personalExpense.groupBy({
      by: ["category"],
      where: {
        createdById: session.userId,
        expenseDate: { gte: startOfMonth, lt: endOfMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.personalExpense.count({
      where: {
        createdById: session.userId,
        status: "OVERDUE",
      },
    }),
  ]);

  const totalMonth = allCurrentMonth.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPaid = allCurrentMonth
    .filter((e) => e.status === "PAID")
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPending = allCurrentMonth
    .filter((e) => e.status === "PENDING")
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const countMonth = allCurrentMonth.length;

  return apiSuccess({
    totalMonth,
    totalPaid,
    totalPending,
    countMonth,
    overdueCount: recentOverdue,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      total: Number(c._sum.amount ?? 0),
      count: c._count.id,
    })),
  });
}
