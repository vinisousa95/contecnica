import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { clientId: true },
  });

  if (!project || project.clientId !== session.clientId) return apiError("Não autorizado", 403);

  const services = await prisma.extraService.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(services.map((s) => ({ ...s, amount: Number(s.amount) })));
}
