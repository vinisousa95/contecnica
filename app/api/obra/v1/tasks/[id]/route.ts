import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

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

  const { status } = await request.json();
  if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return apiError("Status inválido");
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return apiError("Tarefa não encontrada", 404);

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  await syncProjectTask(params.id, status === "COMPLETED");

  return apiSuccess(updated);
}
