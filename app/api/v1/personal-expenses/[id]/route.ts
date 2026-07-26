import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { personalExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  const item = await prisma.personalExpense.findFirst({
    where: { id: params.id, createdById: session.userId },
  });

  if (!item) return apiError("Gasto pessoal não encontrado", 404);
  return apiSuccess(item);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const item = await prisma.personalExpense.updateMany({
      where: { id: params.id, createdById: session.userId },
      data: {
        ...rest,
        amount: parseFloat(amount),
        expenseDate: new Date(expenseDate),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    if (item.count === 0) return apiError("Gasto pessoal não encontrado", 404);

    const updated = await prisma.personalExpense.findUnique({ where: { id: params.id } });
    return apiSuccess(updated);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao atualizar gasto pessoal", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  try {
    const deleted = await prisma.personalExpense.deleteMany({
      where: { id: params.id, createdById: session.userId },
    });

    if (deleted.count === 0) return apiError("Gasto pessoal não encontrado", 404);
    return apiSuccess({ message: "Gasto pessoal excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir gasto pessoal", 500);
  }
}
