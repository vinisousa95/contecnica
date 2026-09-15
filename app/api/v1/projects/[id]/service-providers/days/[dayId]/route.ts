import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE /api/v1/projects/[id]/service-providers/days/[dayId]
// Remove o agendamento de um prestador em um dia.
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; dayId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Confere que o dia pertence a um prestador desta obra antes de apagar.
  const day = await prisma.workProviderDay.findFirst({
    where: { id: params.dayId, workServiceProvider: { projectId: params.id } },
    select: { id: true },
  });
  if (!day) return apiError("Agendamento não encontrado", 404);

  await prisma.workProviderDay.delete({ where: { id: params.dayId } });
  return apiSuccess({ ok: true });
}
