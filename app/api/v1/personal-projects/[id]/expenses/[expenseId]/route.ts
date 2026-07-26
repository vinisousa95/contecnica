import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { canAccessPersonalProject } from "@/lib/personal-project-guard";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { projectExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; expenseId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectExpense.findFirst({
    where: { id: params.expenseId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Lançamento não encontrado", 404);
  const parsed = await validateBody(request, projectExpenseSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { description, category, amount, date, paymentMethod, status, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  const expense = await prisma.personalProjectExpense.update({
    where: { id: params.expenseId },
    data: {
      description: description.trim(), category: category || "outros",
      amount: parseFloat(amount) || 0,
      date: date ? new Date(date + "T12:00:00.000Z") : null,
      paymentMethod: paymentMethod || null, status: status ?? "PENDING", notes: notes || null,
    },
  });
  return apiSuccess({ ...expense, amount: Number(expense.amount) });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; expenseId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectExpense.findFirst({
    where: { id: params.expenseId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Lançamento não encontrado", 404);
  await prisma.personalProjectExpense.delete({ where: { id: params.expenseId } });
  return apiSuccess({ message: "Removido" });
}
