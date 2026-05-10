import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const templates = await prisma.extraItemTemplate.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    take: 10,
    select: { id: true, name: true, description: true, unit: true, unitPrice: true },
  });

  return apiSuccess(
    templates.map((t) => ({ ...t, unitPrice: Number(t.unitPrice) }))
  );
}
