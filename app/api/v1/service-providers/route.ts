import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serviceProviderSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const specialty = searchParams.get("specialty") ?? "";
  const type = searchParams.get("type") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { documentNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (specialty) where.specialty = specialty;
  if (type) where.type = type;

  const [providers, total] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.serviceProvider.count({ where }),
  ]);

  return apiSuccess(providers, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = serviceProviderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { birthDate, ...rest } = parsed.data;
    const provider = await prisma.serviceProvider.create({
      data: { ...rest, ...(birthDate ? { birthDate: new Date(birthDate) } : {}) },
    });

    return apiSuccess(provider);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar prestador", 500);
  }
}
