import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  amount: z.string().optional(),
  markPaid: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string; serviceId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { markPaid, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (markPaid === true) updateData.paidAt = new Date();
  if (markPaid === false) updateData.paidAt = null;

  const existing = await prisma.extraService.findUnique({
    where: { id: params.serviceId, projectId: params.id },
  });
  if (!existing) return apiError("Serviço não encontrado", 404);

  const service = await prisma.extraService.update({
    where: { id: params.serviceId, projectId: params.id },
    data: updateData,
  });

  // When marking as paid, create a ProjectTask in execução da obra (if not already there)
  if (markPaid === true && !existing.paidAt) {
    const taskCount = await prisma.projectTask.count({ where: { projectId: params.id } });
    await prisma.projectTask.create({
      data: {
        projectId: params.id,
        name: existing.name,
        description: existing.description,
        order: taskCount,
        showInPortal: true,
      },
    });
  }

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
