import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  imageUrl: z.string().min(1),
  description: z.string().optional(),
  visible: z.boolean().default(true),
  taskId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const photos = await prisma.projectPhoto.findMany({
    where: { projectId: params.id },
    include: { task: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(photos);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return apiError("Obra não encontrada", 404);

  const body = await request.json();
  const { taskId, ...data } = schema.parse(body);

  const photo = await prisma.projectPhoto.create({
    data: { projectId: params.id, ...data, ...(taskId ? { taskId } : {}) },
    include: { task: { select: { id: true, name: true } } },
  });

  return apiSuccess(photo, 201);
}
