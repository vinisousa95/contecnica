import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";
import { serializeBudget } from "./serialize";

async function generateCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORC-${year}-`;
  const last = await prisma.budget.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const seq = last ? parseInt(last.code.split("-")[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const tier = searchParams.get("tier") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tier) where.tier = tier;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { items: true, extraItems: true } },
      },
    }),
    prisma.budget.count({ where }),
  ]);

  return apiSuccess(
    budgets.map((b) => ({ ...b, totalAmount: Number(b.totalAmount) })),
    { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { items, extraItems, validUntil, discount = 0, ...rest } = parsed.data;

    // Calculate total with discount
    const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const extrasTotal = extraItems.reduce((sum, i) => sum + i.subtotal, 0);
    const subtotal = itemsTotal + extrasTotal;
    const totalAmount = subtotal * (1 - (discount ?? 0) / 100);

    const code = await generateCode();

    const [clientExists, userExists] = await Promise.all([
      prisma.client.findUnique({ where: { id: rest.clientId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { id: true } }),
    ]);

    if (!clientExists) return apiError(`Cliente não encontrado (id: ${rest.clientId})`, 400);
    if (!userExists) return apiError("Sessão inválida — faça logout e entre novamente", 401);

    const budget = await prisma.budget.create({
      data: {
        ...rest,
        code,
        discount: discount ?? 0,
        validUntil: validUntil ? new Date(validUntil) : null,
        totalAmount,
        createdById: session.userId,
        items: {
          create: items.map((i) => ({
            reformItemId: i.reformItemId ?? null,
            reformPackageId: (i as any).reformPackageId ?? null,
            name: (i as any).name ?? null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })) as any,
        },
        extraItems: {
          create: extraItems.map((e, idx) => ({
            name: e.name,
            description: e.description,
            room: e.room ?? null,
            quantity: e.quantity,
            unit: e.unit,
            unitPrice: e.unitPrice,
            subtotal: e.subtotal,
            sortOrder: idx,
          })) as any,
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: { include: { reformItem: true, reformPackage: { include: { items: true } } } as any },
        extraItems: true,
      },
    });

    // Save extra items to template library (fire-and-forget)
    void saveExtraItemTemplates(extraItems);

    return apiSuccess(serializeBudget(budget));
  } catch (err) {
    console.error(err);
    return apiError("Erro ao criar orçamento", 500);
  }
}

async function saveExtraItemTemplates(extraItems: { name: string; description?: string | null; unit: string; unitPrice: number }[]) {
  for (const e of extraItems) {
    if (!e.name?.trim()) continue;
    try {
      await prisma.extraItemTemplate.upsert({
        where: { name: e.name.trim() },
        update: {
          description: e.description ?? undefined,
          unit: e.unit as any,
          unitPrice: e.unitPrice,
          usageCount: { increment: 1 },
        },
        create: {
          name: e.name.trim(),
          description: e.description ?? null,
          unit: e.unit as any,
          unitPrice: e.unitPrice,
        },
      });
    } catch { /* ignore individual failures */ }
  }
}
