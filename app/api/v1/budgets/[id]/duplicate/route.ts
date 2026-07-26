import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { serializeBudget } from "../../serialize";

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const original = await prisma.budget.findUnique({
    where: { id: params.id },
    include: { items: true, extraItems: true },
  });

  if (!original) return apiError("Orçamento não encontrado", 404);

  const code = await generateCode();

  const budget = await prisma.budget.create({
    data: {
      code,
      clientId: original.clientId,
      title: `${original.title} (Cópia)`,
      tier: original.tier,
      status: "DRAFT",
      totalAmount: original.totalAmount,
      notes: original.notes,
      validUntil: null,
      zipCode: original.zipCode,
      street: original.street,
      number: original.number,
      complement: original.complement,
      neighborhood: original.neighborhood,
      city: original.city,
      state: original.state,
      createdById: session.userId,
      items: {
        create: original.items.map((i) => ({
          reformItemId: i.reformItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
      },
      extraItems: {
        create: original.extraItems.map((e) => ({
          name: e.name,
          description: e.description,
          room: (e as any).room ?? null,
          quantity: e.quantity,
          unit: e.unit,
          unitPrice: e.unitPrice,
          subtotal: e.subtotal,
          sortOrder: e.sortOrder,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { reformItem: true } },
      extraItems: true,
    },
  });

  return apiSuccess(serializeBudget(budget));
}
