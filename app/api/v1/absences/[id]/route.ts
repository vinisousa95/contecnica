import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { absenceUpdateSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const parsed = await validateBody(request, absenceUpdateSchema);
    if (!parsed.ok) return apiError(parsed.error, parsed.status);
    const body = parsed.data as any;
    const { date, reason, notes, justified } = body;

    const absence = await prisma.employeeAbsence.update({
      where: { id: params.id },
      data: {
        ...(date ? { date: new Date(date + "T12:00:00.000Z") } : {}),
        ...(reason ? { reason: reason.trim() } : {}),
        notes: notes?.trim() || null,
        ...(justified !== undefined ? { justified } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    return apiSuccess(absence);
  } catch (error: any) {
    if (error?.code === "P2025") return apiError("Registro não encontrado", 404);
    return apiError("Erro ao atualizar", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.employeeAbsence.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Falta excluída" });
  } catch {
    return apiError("Erro ao excluir", 500);
  }
}
