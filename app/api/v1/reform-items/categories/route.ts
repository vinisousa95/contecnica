import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const items = await (prisma.reformItem as any).findMany({
    where: { category: "OTHERS", customCategory: { not: null } },
    select: { customCategory: true },
    distinct: ["customCategory"],
    orderBy: { customCategory: "asc" },
  });

  const categories = (items as { customCategory: string | null }[])
    .map((i) => i.customCategory)
    .filter(Boolean) as string[];

  return apiSuccess(categories);
}
