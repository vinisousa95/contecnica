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
        date: new Date(date),
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.workAssignment.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Registro excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir registro", 500);
  }
}
