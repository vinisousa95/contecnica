import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: { serviceId: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const service = await prisma.extraService.findUnique({
    where: { id: params.serviceId },
    include: { project: { select: { clientId: true } } },
  });

  if (!service) return apiError("Serviço não encontrado", 404);
  if (service.project.clientId !== session.clientId) return apiError("Não autorizado", 403);
  if (service.status !== "PENDING_APPROVAL") return apiError("Serviço já foi respondido");

  const updated = await prisma.extraService.update({
    where: { id: params.serviceId },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  return apiSuccess({ ...updated, amount: Number(updated.amount) });
}
