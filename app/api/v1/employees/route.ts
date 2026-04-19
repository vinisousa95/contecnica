import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
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
      { role: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.employee.count({ where }),
  ]);

  return apiSuccess(employees, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const employee = await prisma.employee.create({
      data: parsed.data,
    });

    return apiSuccess(employee);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar funcionário", 500);
  }
}
