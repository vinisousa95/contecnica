import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!expense) return apiError("Despesa não encontrada", 404);
  return apiSuccess({ ...expense, amount: Number(expense.amount) });
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { amount, dueDate, paymentDate, projectId, categoryId, ...rest } = parsed.data;

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...rest,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        projectId: projectId || null,
        categoryId: categoryId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({ ...expense, amount: Number(expense.amount) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Despesa não encontrada", 404);
    return apiError("Erro ao atualizar despesa", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.expense.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Despesa excluída com sucesso" });
  } catch {
    return apiError("Erro ao excluir despesa", 500);
  }
}
