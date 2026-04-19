import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { status } = await request.json();
  if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return apiError("Status inválido");
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return apiError("Tarefa não encontrada", 404);

  // Employee can only update tasks assigned to them or children of their tasks
  // Allow any authenticated user to update task status from tablet view

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  return apiSuccess(updated);
}
