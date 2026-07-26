import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const updates = await prisma.projectUpdate.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(updates);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return apiError("Obra não encontrada", 404);

  const body = await request.json();
  const data = schema.parse(body);

  const update = await prisma.projectUpdate.create({
    data: { projectId: params.id, title: data.title, description: data.description },
  });

  return apiSuccess(update);
}
