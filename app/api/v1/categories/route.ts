import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";

  const where: Record<string, unknown> = { isActive: true };
  if (type) {
    where.OR = [{ type }, { type: "BOTH" }];
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { expenses: true, revenues: true } },
    },
  });

  return apiSuccess(categories);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const exists = await prisma.category.findUnique({ where: { name: parsed.data.name } });
    if (exists) {
      return apiError("Já existe uma categoria com este nome");
    }

    const category = await prisma.category.create({ data: parsed.data });
    return apiSuccess(category);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar categoria", 500);
  }
}
