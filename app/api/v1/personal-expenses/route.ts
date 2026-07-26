import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { personalExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const month = searchParams.get("month") ?? "";
  const year = searchParams.get("year") ?? "";

  const where: Record<string, unknown> = { createdById: session.userId };

  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }
  if (category) where.category = category;
  if (status) where.status = status;

  if (month && year) {
    const y = parseInt(year);
    const m = parseInt(month) - 1;
    where.expenseDate = {
      gte: new Date(y, m, 1),
      lt: new Date(y, m + 1, 1),
    };
  } else if (year) {
    const y = parseInt(year);
    where.expenseDate = {
      gte: new Date(y, 0, 1),
      lt: new Date(y + 1, 0, 1),
    };
  }

  const [items, total] = await Promise.all([
    prisma.personalExpense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { expenseDate: "desc" },
    }),
    prisma.personalExpense.count({ where }),
  ]);

  return apiSuccess(items, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  try {
    const body = await request.json();
    const parsed = personalExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { amount, expenseDate, dueDate, ...rest } = parsed.data;

    const item = await prisma.personalExpense.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        expenseDate: new Date(expenseDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.userId,
      },
    });

    return apiSuccess(item);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar gasto pessoal", 500);
  }
}
