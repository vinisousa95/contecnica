import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
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
