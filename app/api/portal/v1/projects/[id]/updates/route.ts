import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    select: { id: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  const updates = await prisma.projectUpdate.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(updates);
}
