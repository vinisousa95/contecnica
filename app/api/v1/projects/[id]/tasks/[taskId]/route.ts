import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
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
}).strict();

async function recalcProgress(projectId: string) {
  const tasks = await prisma.projectTask.findMany({
    where: { projectId },
    select: { isCompleted: true },
  });
  if (tasks.length === 0) return;
  const done = tasks.filter((t) => t.isCompleted).length;
  const progress = Math.round((done / tasks.length) * 100);
  await prisma.project.update({ where: { id: projectId }, data: { progress } });
}

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

  if (isCompleted !== undefined) {
    await recalcProgress(params.id);

    if (isCompleted === true && task.showInPortal) {
      await prisma.projectUpdate.create({
        data: {
          projectId: params.id,
          title: `${task.name} concluído`,
          description: task.description ?? undefined,
        },
      });
    }
  }

  return apiSuccess(task);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.projectTask.delete({ where: { id: params.taskId, projectId: params.id } });
  await recalcProgress(params.id);
  return apiSuccess({ deleted: true });
}
