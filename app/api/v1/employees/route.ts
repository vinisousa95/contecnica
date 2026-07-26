import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
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

  return apiSuccess(
    employees.map((e) => ({
      ...e,
      dailyRate: e.dailyRate !== null ? Number(e.dailyRate) : null,
      monthlyRate: e.monthlyRate !== null ? Number(e.monthlyRate) : null,
    })),
    { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  );
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

    const { birthDate, contractStartDate, contractEndDate, ...rest } = parsed.data;
    const employee = await prisma.employee.create({
      data: {
        ...rest,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
        ...(contractStartDate ? { contractStartDate: new Date(contractStartDate + "T12:00:00.000Z") } : {}),
        ...(contractEndDate ? { contractEndDate: new Date(contractEndDate + "T12:00:00.000Z") } : {}),
      },
    });

    return apiSuccess({
      ...employee,
      dailyRate: employee.dailyRate !== null ? Number(employee.dailyRate) : null,
      monthlyRate: employee.monthlyRate !== null ? Number(employee.monthlyRate) : null,
    });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar funcionário", 500);
  }
}
