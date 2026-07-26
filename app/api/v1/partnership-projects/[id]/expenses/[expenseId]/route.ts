import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { projectExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const parsed = await validateBody(request, projectExpenseSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { description, category, amount, date, paymentMethod, status, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  const expense = await prisma.partnershipExpense.update({
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  await prisma.partnershipExpense.delete({ where: { id: params.expenseId } });
  return apiSuccess({ message: "Removido" });
}
