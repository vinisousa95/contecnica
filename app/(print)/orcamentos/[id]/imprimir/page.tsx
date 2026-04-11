import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintView } from "./print-view";

export default async function ImprimirOrcamentoPage({ params }: { params: { id: string } }) {
  const budget = await prisma.budget.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          document: true,
          phone: true,
          email: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
      createdBy: { select: { name: true } },
      items: {
        include: { reformItem: true },
        orderBy: [{ reformItem: { category: "asc" } }, { reformItem: { sortOrder: "asc" } }],
      },
      extraItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!budget) notFound();

  // Serialize Decimal → number
  const data = {
    ...budget,
    totalAmount: Number(budget.totalAmount),
    items: budget.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
      reformItem: i.reformItem
        ? {
            ...i.reformItem,
            priceLow: Number(i.reformItem.priceLow),
            priceMedium: Number(i.reformItem.priceMedium),
            priceHigh: Number(i.reformItem.priceHigh),
          }
        : null,
    })),
    extraItems: budget.extraItems.map((e) => ({
      ...e,
      quantity: Number(e.quantity),
      unitPrice: Number(e.unitPrice),
      subtotal: Number(e.subtotal),
    })),
  };

  return <PrintView budget={data as any} />;
}
