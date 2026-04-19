import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  });

  if (!employee) return apiError("Funcionário não encontrado", 404);
  return apiSuccess(employee);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return apiSuccess(employee);
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
