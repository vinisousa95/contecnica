import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findFirst({
    where: { id: params.id, client: { id: session.clientId } },
  });
  if (!project) return apiError("Não encontrado", 404);

  const tasks = await prisma.projectTask.findMany({
    where: { projectId: params.id, showInPortal: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return apiSuccess(tasks);
}
