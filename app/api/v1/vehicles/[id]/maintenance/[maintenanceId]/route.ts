import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/utils";

const maintenanceSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().optional().nullable(),
  km: z.number().int().optional().nullable(),
  cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; maintenanceId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  try {
    const record = await prisma.vehicleMaintenance.update({
      where: { id: params.maintenanceId },
      data: {
        date: new Date(parsed.data.date + "T12:00:00.000Z"),
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        km: parsed.data.km ?? null,
        cost: parsed.data.cost ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
    return apiSuccess({ ...record, cost: record.cost !== null ? Number(record.cost) : null });
  } catch {
    return apiError("Registro não encontrado", 404);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; maintenanceId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.vehicleMaintenance.delete({ where: { id: params.maintenanceId } });
    return apiSuccess({ message: "Registro excluído" });
  } catch {
    return apiError("Registro não encontrado", 404);
  }
}
