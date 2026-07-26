import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
  amount: z.string().optional(),
  markPaid: z.boolean().optional(),
  markAccepted: z.boolean().optional(),
  markRejected: z.boolean().optional(),
  markPending: z.boolean().optional(),
}).strict();

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; serviceId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { markPaid, markAccepted, markRejected, markPending, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (markPaid === true) updateData.paidAt = new Date();
  if (markPaid === false) updateData.paidAt = null;
  if (markAccepted === true) { updateData.status = "ACCEPTED"; updateData.acceptedAt = new Date(); }
  if (markRejected === true) { updateData.status = "REJECTED"; updateData.rejectedAt = new Date(); }
  if (markPending === true) { updateData.status = "PENDING_APPROVAL"; updateData.acceptedAt = null; updateData.rejectedAt = null; }

  const existing = await prisma.extraService.findUnique({
    where: { id: params.serviceId, projectId: params.id },
  });
  if (!existing) return apiError("Serviço não encontrado", 404);

  const service = await prisma.extraService.update({
    where: { id: params.serviceId, projectId: params.id },
    data: updateData,
  });

  if (markPaid === true && !existing.paidAt) {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { clientId: true },
    });

    await prisma.$transaction([
      // Add to Receita total as RECEIVED revenue
      prisma.revenue.create({
        data: {
          projectId: params.id,
          clientId: project?.clientId ?? null,
          description: `Serviço extra: ${existing.name}`,
          amount: existing.amount,
          dueDate: new Date(),
          receivedDate: new Date(),
          status: "RECEIVED",
          createdById: session.userId,
        },
      }),
      // Add to Execução da Obra
      prisma.projectTask.create({
        data: {
          projectId: params.id,
          name: existing.name,
          description: existing.description,
          order: 999,
          showInPortal: true,
        },
      }),
    ]);
  }

  return apiSuccess({ ...service, amount: Number(service.amount) });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; serviceId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const existing = await prisma.extraService.findUnique({ where: { id: params.serviceId } });
  if (!existing) return apiError("Serviço não encontrado", 404);
  if (existing.status === "ACCEPTED") return apiError("Serviço aceito pelo cliente não pode ser removido");

  await prisma.extraService.delete({ where: { id: params.serviceId } });
  return apiSuccess({ message: "Serviço removido" });
}
