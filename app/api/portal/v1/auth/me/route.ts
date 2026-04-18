import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const clientUser = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    include: { client: { select: { id: true, name: true, email: true, phone: true } } },
  });

  if (!clientUser || !clientUser.isActive) return apiError("Não autorizado", 401);

  return apiSuccess({
    id: clientUser.id,
    name: clientUser.name,
    email: clientUser.email,
    clientId: clientUser.clientId,
    clientName: clientUser.client.name,
  });
}
