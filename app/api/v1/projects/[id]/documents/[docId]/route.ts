import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).optional(),
  visible: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const data = schema.parse(body);

  const doc = await prisma.projectDocument.update({
    where: { id: params.docId, projectId: params.id },
    data,
  });

  return apiSuccess(doc);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.projectDocument.delete({ where: { id: params.docId, projectId: params.id } });

  return apiSuccess({ message: "Documento removido" });
}
