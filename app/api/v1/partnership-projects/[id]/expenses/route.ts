import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { projectExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const expenses = await prisma.partnershipExpense.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "desc" } });
  return apiSuccess(expenses.map(e => ({ ...e, amount: Number(e.amount) })));
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const parsed = await validateBody(request, projectExpenseSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { description, category, amount, date, paymentMethod, status, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  if (!category) return apiError("Categoria é obrigatória");
  const expense = await prisma.partnershipExpense.create({
    data: {
      projectId: params.id, description: description.trim(), category,
      amount: parseFloat(amount) || 0,
      date: date ? new Date(date + "T12:00:00.000Z") : null,
      paymentMethod: paymentMethod || null, status: status ?? "PENDING", notes: notes || null,
    },
  });
  return apiSuccess({ ...expense, amount: Number(expense.amount) });
}
