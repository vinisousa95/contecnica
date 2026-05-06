import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const includeRelations = {
  vehicle: { select: { id: true, name: true, plate: true } },
  employee: { select: { id: true, name: true } },
  assignment: {
    select: {
      id: true,
      date: true,
      employee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  },
};

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = request.nextUrl;
  const vehicleId = searchParams.get("vehicleId");
  const status = searchParams.get("status");

  const fines = await prisma.vehicleFine.findMany({
    where: {
      ...(vehicleId ? { vehicleId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: includeRelations,
    orderBy: { date: "desc" },
  });

  return apiSuccess(fines);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const { vehicleId, employeeId, assignmentId, date, amount, reason, points, status, notes } = body;

    if (!vehicleId) return apiError("Veículo é obrigatório");
    if (!date) return apiError("Data é obrigatória");
    if (!reason?.trim()) return apiError("Motivo é obrigatório");
    if (!amount) return apiError("Valor é obrigatório");

    const fine = await prisma.vehicleFine.create({
      data: {
        vehicleId,
        employeeId: employeeId || null,
        assignmentId: assignmentId || null,
        date: new Date(date + "T12:00:00.000Z"),
        amount: parseFloat(amount),
        reason: reason.trim(),
        points: points ? parseInt(points) : null,
        status: status ?? "PENDING",
        notes: notes?.trim() || null,
      },
      include: includeRelations,
    });

    return apiSuccess(fine, 201);
  } catch {
    return apiError("Erro ao registrar multa", 500);
  }
}
