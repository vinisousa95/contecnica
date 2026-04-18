import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCompleted: z.boolean().optional(),
  showInPortal: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const { startDate, endDate, isCompleted, ...rest } = parsed.data;

  const completedAt = isCompleted === true ? new Date() : isCompleted === false ? null : undefined;

  const task = await prisma.projectTask.update({
    where: { id: params.taskId, projectId: params.id },
    data: {
      ...rest,
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(isCompleted !== undefined ? { isCompleted, completedAt } : {}),
    },
  });
  return apiSuccess(task);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.projectTask.delete({ where: { id: params.taskId, projectId: params.id } });
  return apiSuccess({ deleted: true });
}
