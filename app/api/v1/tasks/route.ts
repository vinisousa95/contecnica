import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const parentOnly = searchParams.get("parentOnly") === "true";

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (parentOnly) where.parentId = null;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      children: {
        include: {
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return apiSuccess(tasks);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { dueDate, ...rest } = parsed.data;

  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: session.userId,
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      children: true,
    },
  });

  return apiSuccess(task);
}
