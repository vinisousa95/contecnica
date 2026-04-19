import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Show all tasks (tablet is shared — one login for all employees)
  const tasks = await prisma.task.findMany({
    where: {
      parentId: null,
      status: { not: "COMPLETED" },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      children: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return apiSuccess(tasks);
}
