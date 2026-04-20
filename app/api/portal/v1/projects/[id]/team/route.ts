import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Verify project belongs to this client
  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    select: { id: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  // Return upcoming/active assignments for the next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const assignments = await (prisma as any).workAssignment.findMany({
    where: {
      projectId: params.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      date: { gte: today, lte: nextWeek },
    },
    orderBy: { date: "asc" },
    include: {
      employee: { select: { id: true, name: true, rg: true, phone: true, role: true } },
      vehicle: { select: { id: true, name: true, model: true, plate: true, color: true, type: true } },
    },
  });

  return apiSuccess(
    assignments.map((a: any) => ({
      id: a.id,
      date: a.date,
      departureTime: a.departureTime,
      status: a.status,
      notes: a.notes,
      employee: a.employee,
      vehicle: a.vehicle,
    }))
  );
}
