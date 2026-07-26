import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revenueSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (projectId) where.projectId = projectId;
  if (clientId) where.clientId = clientId;
  if (from || to) {
    where.dueDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [revenues, total] = await Promise.all([
    prisma.revenue.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.revenue.count({ where }),
  ]);

  return apiSuccess(
    revenues.map((r) => ({ ...r, amount: Number(r.amount) })),
    { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = revenueSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { amount, dueDate, receivedDate, projectId, clientId, categoryId, ...rest } = parsed.data;

    const revenue = await prisma.revenue.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        projectId: projectId || null,
        clientId: clientId || null,
        categoryId: categoryId || null,
        createdById: session.userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({ ...revenue, amount: Number(revenue.amount) });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar receita", 500);
  }
}
