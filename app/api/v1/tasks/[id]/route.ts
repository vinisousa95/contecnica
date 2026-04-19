import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

async function syncProjectTask(taskId: string, completed: boolean) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const match = await prisma.projectTask.findFirst({
    where: {
      projectId: task.projectId,
      name: { equals: task.name, mode: "insensitive" },
    },
  });
  if (!match) return;

  await prisma.projectTask.update({
    where: { id: match.id },
    data: {
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
      ...(completed && !match.endDate ? { endDate: new Date() } : {}),
    },
  });

  const tasks = await prisma.projectTask.findMany({
    where: { projectId: task.projectId },
    select: { isCompleted: true },
  });
  if (tasks.length > 0) {
    const done = tasks.filter((t) => t.isCompleted).length;
    await prisma.project.update({
      where: { id: task.projectId },
      data: { progress: Math.round((done / tasks.length) * 100) },
    });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { dueDate, status, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) {
    updateData.status = status;
    updateData.completedAt = status === "COMPLETED" ? new Date() : null;
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      children: { include: { assignee: { select: { id: true, name: true } } } },
    },
  });

  if (status !== undefined) {
    await syncProjectTask(params.id, status === "COMPLETED");
  }

  return apiSuccess(task);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.task.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Tarefa removida" });
}
