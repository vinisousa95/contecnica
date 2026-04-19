import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Return parent tasks (no parentId) assigned to this user, with their children
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: session.userId,
      parentId: null,
      status: { not: "COMPLETED" },
    },
    include: {
      project: { select: { id: true, name: true } },
      children: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return apiSuccess(tasks);
}
