import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const clientId = searchParams.get("clientId") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { expenses: true, revenues: true } },
        expenses: { select: { amount: true } },
        revenues: { select: { amount: true } },
        photos: { select: { imageUrl: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const enriched = projects.map((p) => ({
    ...p,
    totalExpenses: p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    totalRevenues: p.revenues.reduce((sum, r) => sum + Number(r.amount), 0),
    margin:
      p.revenues.reduce((sum, r) => sum + Number(r.amount), 0) -
      p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    coverPhoto: p.photos[0]?.imageUrl ?? null,
  }));

  return apiSuccess(enriched, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = projectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { startDate, expectedEndDate, budget, ...rest } = parsed.data;

    const project = await prisma.project.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
        budget: budget ? parseFloat(budget) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(project);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar obra", 500);
  }
}
