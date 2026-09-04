import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Verify project belongs to this client
  const project = await prisma.project.findFirst({
    where: { id: params.id, clientId: session.clientId },
    select: { id: true },
  });
  if (!project) return apiError("Obra não encontrada", 404);

  // Return assignments from the last 14 days through the next 14 days
  const from = new Date();
  from.setDate(from.getDate() - 14);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setDate(to.getDate() + 14);
  to.setHours(23, 59, 59, 999);

  const assignments = await (prisma as any).workAssignment.findMany({
    where: {
      projectId: params.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
      date: { gte: from, lte: to },
    },
    // Mais recentes primeiro, antigas embaixo — é o que o cliente espera ver ao
    // abrir a Equipe na Obra.
    orderBy: { date: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          cpf: true,
          rg: true,
          phone: true,
          role: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
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
