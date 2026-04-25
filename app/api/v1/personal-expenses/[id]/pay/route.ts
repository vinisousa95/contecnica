import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  try {
    const body = await request.json().catch(() => ({}));
    const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();

    const updated = await prisma.personalExpense.updateMany({
      where: { id: params.id, createdById: session.userId },
      data: { status: "PAID", paidDate },
    });

    if (updated.count === 0) return apiError("Gasto pessoal não encontrado", 404);

    const item = await prisma.personalExpense.findUnique({ where: { id: params.id } });
    return apiSuccess(item);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao registrar pagamento", 500);
  }
}
