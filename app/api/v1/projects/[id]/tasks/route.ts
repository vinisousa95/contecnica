import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";
import { validateBody } from "@/lib/api-validation";

// Importar tarefas a partir de um orçamento: payload próprio, validado antes
// de qualquer consulta (este caminho retorna cedo e não passa pelo `schema`).
const importSchema = z.object({
  importBudgetId: z.string().min(1, "Orçamento é obrigatório"),
}).strict();

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  showInPortal: z.boolean().default(true),
  order: z.number().int().default(0),
}).strict();

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const tasks = await prisma.projectTask.findMany({
    where: { projectId: params.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return apiSuccess(tasks);
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const raw = await validateBody(request, z.record(z.unknown()));
  if (!raw.ok) return apiError(raw.error, raw.status);
  const body = raw.data as Record<string, unknown>;

  // Import from budget: body.importBudgetId
  if (body.importBudgetId !== undefined) {
    const imp = importSchema.safeParse(body);
    if (!imp.success) return apiError(imp.error.errors[0].message);

    const budget = await prisma.budget.findFirst({
      where: { id: imp.data.importBudgetId },
      include: {
        items: { include: { reformItem: true, reformPackage: true } as any },
        extraItems: true,
      },
    });
    if (!budget) return apiError("Orçamento não encontrado", 404);

    // Link budget to project
    await prisma.project.update({
      where: { id: params.id },
      data: { linkedBudgetId: imp.data.importBudgetId },
    });

    // Delete existing tasks first to avoid duplicates
    await prisma.projectTask.deleteMany({ where: { projectId: params.id } });

    const allItems = [
      ...budget.items.map((it: any, i) => ({ name: it.reformPackage?.name ?? it.reformItem?.name ?? "Item", description: it.reformItem?.description ?? null, order: i })),
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
