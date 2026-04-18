import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  imageUrl: z.string().url(),
  description: z.string().optional(),
  visible: z.boolean().default(true),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const photos = await prisma.projectPhoto.findMany({
    where: { projectId: params.id },
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
  const data = schema.parse(body);

  const photo = await prisma.projectPhoto.create({
    data: { projectId: params.id, ...data },
  });

  return apiSuccess(photo, 201);
}
