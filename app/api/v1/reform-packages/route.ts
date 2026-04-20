import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
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

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const packages = await (prisma as any).reformPackage.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return apiSuccess(packages.map(serializePackage));
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = reformPackageSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { items, priceLow, priceMedium, priceHigh, ...rest } = parsed.data;

    const pkg = await (prisma as any).reformPackage.create({
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
  } catch (err) {
    console.error(err);
    return apiError("Erro ao criar ambiente", 500);
  }
}
