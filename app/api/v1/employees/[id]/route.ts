import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

function serializeEmployee(e: any) {
  return {
    ...e,
    dailyRate: e.dailyRate !== null ? Number(e.dailyRate) : null,
    monthlyRate: e.monthlyRate !== null ? Number(e.monthlyRate) : null,
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) return apiError("Funcionário não encontrado", 404);
  return apiSuccess(serializeEmployee(employee));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { birthDate, contractStartDate, contractEndDate, ...rest } = parsed.data;
    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        contractStartDate: contractStartDate ? new Date(contractStartDate + "T12:00:00.000Z") : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate + "T12:00:00.000Z") : null,
      },
    });

    return apiSuccess(serializeEmployee(employee));
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Funcionário não encontrado", 404);
    return apiError("Erro ao atualizar funcionário", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.employee.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Funcionário excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir funcionário", 500);
  }
}
