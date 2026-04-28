import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const absences = await prisma.employeeAbsence.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
        },
      } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, role: true } },
    },
    orderBy: { date: "desc" },
  });

  return apiSuccess(absences);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const { employeeId, date, reason, notes, justified } = body;

    if (!employeeId) return apiError("Funcionário é obrigatório");
    if (!date) return apiError("Data é obrigatória");
    if (!reason?.trim()) return apiError("Motivo é obrigatório");

    const absence = await prisma.employeeAbsence.create({
      data: {
        employeeId,
        date: new Date(date + "T12:00:00.000Z"),
        reason: reason.trim(),
        notes: notes?.trim() || null,
        justified: justified ?? false,
      },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    return apiSuccess(absence, 201);
  } catch {
    return apiError("Erro ao registrar falta", 500);
  }
}
