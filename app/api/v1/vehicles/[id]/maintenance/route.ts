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
  workshop: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const records = await prisma.vehicleMaintenance.findMany({
    where: { vehicleId: params.id },
    orderBy: { date: "desc" },
  });

  return apiSuccess(records.map((r) => ({ ...r, cost: r.cost !== null ? Number(r.cost) : null })));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const record = await prisma.vehicleMaintenance.create({
    data: {
      vehicleId: params.id,
      date: new Date(parsed.data.date + "T12:00:00.000Z"),
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      km: parsed.data.km ?? null,
      cost: parsed.data.cost ?? null,
      workshop: parsed.data.workshop ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return apiSuccess({ ...record, cost: record.cost !== null ? Number(record.cost) : null });
}
