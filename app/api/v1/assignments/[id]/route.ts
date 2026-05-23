import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignmentSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const assignment = await prisma.workAssignment.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, role: true, phone: true } },
      vehicle: { select: { id: true, name: true, plate: true, model: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!assignment) return apiError("Registro não encontrado", 404);
  return apiSuccess(assignment);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { date, vehicleId, ...rest } = parsed.data;

    const assignment = await prisma.workAssignment.update({
      where: { id: params.id },
      data: {
        ...rest,
        date: new Date(date + "T12:00:00.000Z"),
        vehicleId: vehicleId || null,
      },
      include: {
        employee: { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true, plate: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(assignment);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Registro não encontrado", 404);
    return apiError("Erro ao atualizar registro", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const { workedConfirmed, paymentDate } = body as { workedConfirmed?: boolean; paymentDate?: string | null };

    const existing = await prisma.workAssignment.findUnique({
      where: { id: params.id },
      select: { expenseId: true },
    });
    if (!existing) return apiError("Registro não encontrado", 404);

    const updateData: Record<string, unknown> = {};
    if (workedConfirmed !== undefined) updateData.workedConfirmed = workedConfirmed;

    if (Object.keys(updateData).length > 0) {
      await prisma.workAssignment.update({ where: { id: params.id }, data: updateData });
    }

    if (existing.expenseId) {
      if (paymentDate) {
        await prisma.expense.update({
          where: { id: existing.expenseId },
          data: { paymentDate: new Date(paymentDate + "T12:00:00.000Z"), status: "PAID" },
        });
      } else if (paymentDate === null) {
        await prisma.expense.update({
          where: { id: existing.expenseId },
          data: { paymentDate: null, status: "PENDING" },
        });
      }
    }

    const assignment = await prisma.workAssignment.findUnique({
      where: { id: params.id },
      include: {
        employee: { select: { id: true, name: true, role: true } },
        expense: { select: { id: true, status: true, paymentDate: true, amount: true } },
      },
    });
    return apiSuccess(assignment);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao atualizar registro", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    // Delete linked auto-generated expense first
    const assignment = await prisma.workAssignment.findUnique({
      where: { id: params.id },
      select: { expenseId: true },
    });
    if (assignment?.expenseId) {
      await prisma.expense.delete({ where: { id: assignment.expenseId } }).catch(() => {});
    }
    await prisma.workAssignment.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Registro excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir registro", 500);
  }
}
