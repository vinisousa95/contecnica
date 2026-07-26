import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { fineUpdateSchema } from "@/lib/validations";
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const parsed = await validateBody(request, fineUpdateSchema);
    if (!parsed.ok) return apiError(parsed.error, parsed.status);
    const body = parsed.data as any;
    const { date, amount, reason, points, status, notes, employeeId, assignmentId } = body;

    const fine = await prisma.vehicleFine.update({
      where: { id: params.id },
      data: {
        ...(date ? { date: new Date(date + "T12:00:00.000Z") } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(reason ? { reason: reason.trim() } : {}),
        points: points !== undefined ? (points ? parseInt(points) : null) : undefined,
        ...(status ? { status } : {}),
        notes: notes?.trim() || null,
        employeeId: employeeId || null,
        assignmentId: assignmentId || null,
      },
      include: includeRelations,
    });

    return apiSuccess(fine);
  } catch (error: any) {
    if (error?.code === "P2025") return apiError("Multa não encontrada", 404);
    return apiError("Erro ao atualizar", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.vehicleFine.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Multa excluída" });
  } catch {
    return apiError("Erro ao excluir", 500);
  }
}
