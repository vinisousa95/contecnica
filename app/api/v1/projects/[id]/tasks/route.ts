import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  showInPortal: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const tasks = await prisma.projectTask.findMany({
    where: { projectId: params.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return apiSuccess(tasks);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();

  // Import from budget: body.importBudgetId
  if (body.importBudgetId) {
    const budget = await prisma.budget.findFirst({
      where: { id: body.importBudgetId },
      include: {
        items: { include: { reformItem: true } },
        extraItems: true,
      },
    });
    if (!budget) return apiError("Orçamento não encontrado", 404);

    // Link budget to project
    await prisma.project.update({
      where: { id: params.id },
      data: { linkedBudgetId: body.importBudgetId },
    });

    // Delete existing tasks first to avoid duplicates
    await prisma.projectTask.deleteMany({ where: { projectId: params.id } });

    const allItems = [
      ...budget.items.map((it, i) => ({ name: it.reformItem.name, description: it.reformItem.description, order: i })),
      ...budget.extraItems.map((it, i) => ({ name: it.name, description: it.description ?? undefined, order: budget.items.length + i })),
    ];

    const tasks = await prisma.projectTask.createMany({
      data: allItems.map((it) => ({
        projectId: params.id,
        name: it.name,
        description: it.description ?? null,
        order: it.order,
      })),
    });

    return apiSuccess({ imported: tasks.count });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const { startDate, endDate, ...rest } = parsed.data;
  const task = await prisma.projectTask.create({
    data: {
      ...rest,
      projectId: params.id,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  return apiSuccess(task);
}
