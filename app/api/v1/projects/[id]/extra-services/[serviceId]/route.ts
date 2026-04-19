import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  amount: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string; serviceId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const service = await prisma.extraService.update({
    where: { id: params.serviceId, projectId: params.id },
    data: parsed.data,
  });

  return apiSuccess({ ...service, amount: Number(service.amount) });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; serviceId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const existing = await prisma.extraService.findUnique({ where: { id: params.serviceId } });
  if (!existing) return apiError("Serviço não encontrado", 404);
  if (existing.status === "ACCEPTED") return apiError("Serviço aceito pelo cliente não pode ser removido");

  await prisma.extraService.delete({ where: { id: params.serviceId } });
  return apiSuccess({ message: "Serviço removido" });
}
