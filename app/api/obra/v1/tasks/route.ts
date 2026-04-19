import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Find employee record by matching email to logged-in user
  const employee = await prisma.employee.findFirst({
    where: { name: { equals: session.name, mode: "insensitive" } },
  });

  const { searchParams } = new URL(request.url);
  const employeeIdParam = searchParams.get("employeeId");
  const assigneeId = employeeIdParam ?? employee?.id;

  if (!assigneeId) return apiSuccess([]);

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId,
      parentId: null,
      status: { not: "COMPLETED" },
    },
    include: {
      project: { select: { id: true, name: true } },
      children: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return apiSuccess(tasks);
}
