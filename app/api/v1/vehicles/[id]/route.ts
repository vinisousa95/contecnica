import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
  });

  if (!vehicle) return apiError("Veículo não encontrado", 404);
  return apiSuccess(vehicle);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { lastOilChangeDate, ...rest } = parsed.data;
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        ...rest,
        plate: rest.plate || null,
        lastOilChangeDate: lastOilChangeDate
          ? new Date(lastOilChangeDate + "T12:00:00.000Z")
          : null,
      },
    });

    return apiSuccess(vehicle);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Veículo não encontrado", 404);
    if ((error as { code?: string }).code === "P2002") return apiError("Já existe um veículo com essa placa", 409);
    return apiError("Erro ao atualizar veículo", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.vehicle.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Veículo excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir veículo", 500);
  }
}
