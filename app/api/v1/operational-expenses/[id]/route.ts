import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE /api/v1/operational-expenses/[id] — remove o lançamento operacional.
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Só apaga se for mesmo um lançamento operacional (não uma despesa comum).
  const expense = await prisma.expense.findFirst({
    where: { id: params.id, operationalType: { not: null } },
    select: { id: true },
  });
  if (!expense) return apiError("Lançamento não encontrado", 404);

  await prisma.expense.delete({ where: { id: params.id } });
  return apiSuccess({ ok: true });
}
