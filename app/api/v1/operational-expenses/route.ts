import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { operationalExpenseSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

// Rótulo e categoria de cada tipo operacional.
const TYPE_LABEL: Record<string, string> = {
  FUEL: "Combustível",
  TOLL: "Pedágio",
  TRANSPORT: "Transporte",
};

/** Garante a categoria (EXPENSE) com o nome do tipo, para agrupar no financeiro. */
async function categoryIdFor(label: string): Promise<string> {
  const existing = await prisma.category.findUnique({ where: { name: label }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name: label, type: "EXPENSE" },
    select: { id: true },
  });
  return created.id;
}

// GET /api/v1/operational-expenses?type=FUEL  → lançamentos do tipo
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const type = request.nextUrl.searchParams.get("type") ?? "";
  if (!["FUEL", "TOLL", "TRANSPORT"].includes(type)) return apiError("Tipo inválido");

  const items = await prisma.expense.findMany({
    where: { operationalType: type as any },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  const total = items.reduce((s, e) => s + Number(e.amount), 0);

  return apiSuccess({
    total,
    items: items.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      date: e.dueDate,
      status: e.status,
      notes: e.notes,
      project: e.project ? { id: e.project.id, name: e.project.name } : null,
    })),
  });
}

// POST /api/v1/operational-expenses  → cria a despesa (custo interno) na obra
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = operationalExpenseSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { type, projectId, amount, date, notes } = parsed.data;
    const label = TYPE_LABEL[type];

    // Confere que a obra existe (regular). Obras pessoais/parcerias têm tabela
    // de despesa própria e não entram aqui.
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return apiError("Obra não encontrada", 404);

    const categoryId = await categoryIdFor(label);

    const expense = await prisma.expense.create({
      data: {
        projectId,
        categoryId,
        operationalType: type,
        description: notes?.trim() ? `${label} — ${notes.trim()}` : label,
        amount: parseFloat(amount),
        dueDate: new Date(date + "T12:00:00.000Z"),
        status: "PENDING",
        internalCost: true, // custo da empresa na obra — não vai ao cliente
        notes: notes?.trim() || null,
        createdById: session.userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return apiSuccess({
      id: expense.id,
      amount: Number(expense.amount),
      date: expense.dueDate,
      status: expense.status,
      notes: expense.notes,
      project: expense.project ? { id: expense.project.id, name: expense.project.name } : null,
    });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao lançar", 500);
  }
}
