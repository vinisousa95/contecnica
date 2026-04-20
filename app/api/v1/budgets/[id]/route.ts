import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";
import { serializeBudget } from "../route";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const budget = await prisma.budget.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, phone: true, email: true, document: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: { reformItem: true, reformPackage: { include: { items: true } } } as any,
        orderBy: [{ reformItem: { category: "asc" } }, { reformItem: { sortOrder: "asc" } }],
      },
      extraItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!budget) return apiError("Orçamento não encontrado", 404);
  return apiSuccess(serializeBudget(budget));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Cannot edit an approved budget
  const existing = await prisma.budget.findUnique({
    where: { id: params.id },
    select: { status: true },
  });
  if (!existing) return apiError("Orçamento não encontrado", 404);
  if (existing.status === "APPROVED") {
    return apiError("Orçamentos aprovados não podem ser editados");
  }

  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { items, extraItems, validUntil, discount = 0, ...rest } = parsed.data;

    const subtotal =
      items.reduce((s, i) => s + i.subtotal, 0) +
      extraItems.reduce((s, e) => s + e.subtotal, 0);
    const totalAmount = subtotal * (1 - (discount ?? 0) / 100);

    const budget = await prisma.$transaction(async (tx) => {
      // Remove old items
      await tx.budgetItem.deleteMany({ where: { budgetId: params.id } });
      await tx.budgetExtraItem.deleteMany({ where: { budgetId: params.id } });

      return tx.budget.update({
        where: { id: params.id },
        data: {
          ...rest,
          discount: discount ?? 0,
          validUntil: validUntil ? new Date(validUntil) : null,
          totalAmount,
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
    });

    return apiSuccess(serializeBudget(budget));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return apiError("Orçamento não encontrado", 404);
    return apiError("Erro ao atualizar orçamento", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const existing = await prisma.budget.findUnique({ where: { id: params.id }, select: { status: true } });
  if (!existing) return apiError("Orçamento não encontrado", 404);
  if (existing.status === "APPROVED") return apiError("Orçamentos aprovados não podem ser excluídos");

  try {
    await prisma.budget.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Orçamento excluído" });
  } catch {
    return apiError("Erro ao excluir orçamento", 500);
  }
}
