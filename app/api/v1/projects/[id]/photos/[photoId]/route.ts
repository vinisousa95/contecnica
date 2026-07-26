import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  description: z.string().optional(),
  visible: z.boolean().optional(),
}).strict();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const data = schema.parse(body);

  const photo = await prisma.projectPhoto.update({
    where: { id: params.photoId, projectId: params.id },
    data,
  });

  return apiSuccess(photo);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.projectPhoto.delete({ where: { id: params.photoId, projectId: params.id } });

  return apiSuccess({ message: "Foto removida" });
}
