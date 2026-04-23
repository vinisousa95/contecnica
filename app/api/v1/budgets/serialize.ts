export function serializeBudget(b: any) {
  return {
    ...b,
    discount: Number(b.discount ?? 0),
    totalAmount: Number(b.totalAmount),
    items: b.items?.map((i: any) => ({
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
        : undefined,
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
        : undefined,
    })),
    extraItems: b.extraItems?.map((e: any) => ({
      ...e,
      quantity: Number(e.quantity),
      unitPrice: Number(e.unitPrice),
      subtotal: Number(e.subtotal),
    })),
  };
}
