import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { supplier: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (projectId === "none") {
    where.projectId = null;
  } else if (projectId) {
    where.projectId = projectId;
  }
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.dueDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return apiSuccess(
    expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { amount, dueDate, paymentDate, projectId, categoryId, ...rest } = parsed.data;

    const expense = await prisma.expense.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        projectId: projectId || null,
        categoryId: categoryId || null,
        createdById: session.userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({ ...expense, amount: Number(expense.amount) });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar despesa", 500);
  }
}
