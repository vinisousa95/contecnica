import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { plate: { contains: search, mode: "insensitive" } },
      { type: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return apiSuccess(vehicles, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...parsed.data,
        plate: parsed.data.plate || null,
      },
    });

    return apiSuccess(vehicle);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return apiError("Já existe um veículo com essa placa", 409);
    }
    console.error(error);
    return apiError("Erro ao criar veículo", 500);
  }
}
