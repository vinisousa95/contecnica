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
        include: { reformItem: true, reformPackage: { include: { items: { orderBy: { sortOrder: "asc" } } } } } as any,
        orderBy: [{ reformItem: { category: "asc" } }, { reformItem: { sortOrder: "asc" } }],
      },
      extraItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!budget) notFound();

  const company = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", name: "" },
  });

  // Serialize Decimal → number
  const data = {
    ...budget,
    totalAmount: Number(budget.totalAmount),
    items: budget.items.map((i: any) => ({
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
      reformPackage: i.reformPackage
        ? {
            ...i.reformPackage,
            priceLow: Number(i.reformPackage.priceLow),
            priceMedium: Number(i.reformPackage.priceMedium),
            priceHigh: Number(i.reformPackage.priceHigh),
            items: (i.reformPackage.items ?? []).map((pi: any) => ({
              ...pi,
              quantity: Number(pi.quantity),
            })),
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

  return <PrintView budget={data as any} company={company} />;
}
