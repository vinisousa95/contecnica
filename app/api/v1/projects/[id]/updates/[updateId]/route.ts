import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
}).strict();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; updateId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const data = schema.parse(body);

  const update = await prisma.projectUpdate.update({
    where: { id: params.updateId, projectId: params.id },
    data,
  });

  return apiSuccess(update);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; updateId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.projectUpdate.delete({ where: { id: params.updateId, projectId: params.id } });

  return apiSuccess({ message: "Removido" });
}
