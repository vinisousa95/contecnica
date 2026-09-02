import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { blockedByOnboarding, impersonationBlock } from "@/lib/portal-guard";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest, props: { params: Promise<{ serviceId: string }> }) {
  const params = await props.params;
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Ato de vontade: exige o primeiro acesso concluído. Ver lib/portal-guard.ts.
  // Impersonação (admin vendo como cliente) é somente-visualização.
  const impBlock = impersonationBlock(session);
  if (impBlock) return apiError(impBlock, 403);

  const bloqueio = await blockedByOnboarding(session.clientUserId);
  if (bloqueio) return apiError(bloqueio, 403);

  try {
    const service = await prisma.extraService.findUnique({
      where: { id: params.serviceId },
      include: { project: { select: { clientId: true } } },
    });

    if (!service) return apiError("Serviço não encontrado", 404);
    if (service.project.clientId !== session.clientId) return apiError("Não autorizado", 403);
    if (service.status !== "PENDING_APPROVAL") return apiError("Serviço já foi respondido");

    await prisma.extraService.update({
      where: { id: params.serviceId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return apiSuccess({ message: "Serviço aceito" });
  } catch (err) {
    console.error("accept extra-service error:", err);
    return apiError("Erro ao aceitar serviço", 500);
  }
}
