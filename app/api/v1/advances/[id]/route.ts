import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE /api/v1/advances/[id]
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const adv = await prisma.employeeAdvance.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!adv) return apiError("Adiantamento não encontrado", 404);

  await prisma.employeeAdvance.delete({ where: { id: params.id } });
  return apiSuccess({ ok: true });
}
