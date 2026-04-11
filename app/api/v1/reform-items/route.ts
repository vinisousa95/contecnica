import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reformItemSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.reformItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { budgetItems: true } },
    },
  });

  return apiSuccess(
    items.map((i) => ({
      ...i,
      priceLow: Number(i.priceLow),
      priceMedium: Number(i.priceMedium),
      priceHigh: Number(i.priceHigh),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = reformItemSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { priceLow, priceMedium, priceHigh, ...rest } = parsed.data;

    const item = await prisma.reformItem.create({
      data: {
        ...rest,
        priceLow: parseFloat(priceLow),
        priceMedium: parseFloat(priceMedium),
        priceHigh: parseFloat(priceHigh),
      },
    });

    return apiSuccess({
      ...item,
      priceLow: Number(item.priceLow),
      priceMedium: Number(item.priceMedium),
      priceHigh: Number(item.priceHigh),
    });
  } catch (err) {
    console.error(err);
    return apiError("Erro ao criar item de reforma", 500);
  }
}
