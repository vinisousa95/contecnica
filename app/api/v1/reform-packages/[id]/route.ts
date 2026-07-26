import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { reformPackageSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

function serializePackage(pkg: any) {
  return {
    ...pkg,
    priceLow: Number(pkg.priceLow),
    priceMedium: Number(pkg.priceMedium),
    priceHigh: Number(pkg.priceHigh),
    items: (pkg.items ?? []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPriceLow: item.unitPriceLow != null ? Number(item.unitPriceLow) : null,
      unitPriceMedium: item.unitPriceMedium != null ? Number(item.unitPriceMedium) : null,
      unitPriceHigh: item.unitPriceHigh != null ? Number(item.unitPriceHigh) : null,
    })),
  };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(_request);
  if (!session) return apiError("Não autorizado", 401);

  const pkg = await (prisma as any).reformPackage.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!pkg) return apiError("Ambiente não encontrado", 404);
  return apiSuccess(serializePackage(pkg));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = reformPackageSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { items, priceLow, priceMedium, priceHigh, ...rest } = parsed.data;

    // Delete old items and recreate — simplest correct approach for ordered list
    await (prisma as any).reformPackageItem.deleteMany({ where: { packageId: params.id } });

    const pkg = await (prisma as any).reformPackage.update({
      where: { id: params.id },
      data: {
        ...rest,
        priceLow,
        priceMedium,
        priceHigh,
        items: {
          create: items.map((item, i) => ({
            reformItemId: item.reformItemId || null,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceLow: item.unitPriceLow ?? null,
            unitPriceMedium: item.unitPriceMedium ?? null,
            unitPriceHigh: item.unitPriceHigh ?? null,
            sortOrder: i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return apiSuccess(serializePackage(pkg));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return apiError("Ambiente não encontrado", 404);
    return apiError("Erro ao atualizar ambiente", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const hard = searchParams.get("hard") === "true";

  if (hard) {
    try {
      await (prisma as any).reformPackage.delete({ where: { id: params.id } });
      return apiSuccess({ message: "Ambiente excluído permanentemente" });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2025") return apiError("Ambiente não encontrado", 404);
      return apiError("Erro ao excluir ambiente", 500);
    }
  }

  try {
    await (prisma as any).reformPackage.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return apiSuccess({ message: "Ambiente desativado com sucesso" });
  } catch {
    return apiError("Erro ao desativar ambiente", 500);
  }
}
