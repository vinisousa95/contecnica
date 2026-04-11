import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["SENT", "DRAFT", "CANCELLED"],
  SENT: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
  CANCELLED: ["DRAFT"],
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const existing = await prisma.budget.findUnique({
    where: { id: params.id },
    select: { status: true },
  });
  if (!existing) return apiError("Orçamento não encontrado", 404);

  const body = await request.json();
  const { status } = body;

  if (!status) return apiError("Status é obrigatório");

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(status)) {
    return apiError(`Transição de ${existing.status} para ${status} não é permitida`);
  }

  const budget = await prisma.budget.update({
    where: { id: params.id },
    data: { status },
    select: { id: true, status: true, code: true },
  });

  return apiSuccess(budget);
}
