import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignmentSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { employee: { name: { contains: search, mode: "insensitive" } } },
      { project: { name: { contains: search, mode: "insensitive" } } },
      { vehicle: { name: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (projectId) where.projectId = projectId;

  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const [assignments, total] = await Promise.all([
    prisma.workAssignment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        employee: { select: { id: true, name: true, role: true, cpf: true, rg: true, dailyRate: true } },
        vehicle: { select: { id: true, name: true, plate: true, color: true, model: true } },
        project: { select: { id: true, name: true } },
        expense: { select: { id: true, status: true, paymentDate: true, amount: true } },
      },
    }),
    prisma.workAssignment.count({ where }),
  ]);

  return apiSuccess(assignments, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { date, vehicleId, ...rest } = parsed.data;
    const workDate = new Date(date + "T12:00:00.000Z");

    const assignment = await prisma.workAssignment.create({
      data: {
        ...rest,
        date: workDate,
        vehicleId: vehicleId || null,
      },
      include: {
        employee: { select: { id: true, name: true, role: true, dailyRate: true } },
        vehicle: { select: { id: true, name: true, plate: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Auto-generate expense if employee has a daily rate
    if ((assignment.employee as any).dailyRate) {
      const dailyRate = Number((assignment.employee as any).dailyRate);
      const expense = await prisma.expense.create({
        data: {
          description: `Diária — ${assignment.employee.name}`,
          amount: dailyRate,
          dueDate: workDate,
          status: "PENDING",
          projectId: rest.projectId || null,
          createdById: session.userId,
        },
      });
      await prisma.workAssignment.update({
        where: { id: assignment.id },
        data: { expenseId: expense.id },
      });
      (assignment as any).expenseId = expense.id;
      (assignment as any).expense = { id: expense.id, status: "PENDING", paymentDate: null, amount: dailyRate };
    }

    return apiSuccess(assignment);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar registro", 500);
  }
}
