import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// Transforma "YYYY-MM-DD" em meia-noite UTC, do mesmo jeito que o resto do
// sistema guarda datas sem hora. Assim a comparação por dia é exata.
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/v1/projects/[id]/service-providers/days?date=YYYY-MM-DD
// Lista os prestadores agendados na obra para o dia informado, já com os
// dados do vínculo (nome, especialidade, atribuição, valor, status).
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const dateStr = request.nextUrl.searchParams.get("date");
  if (!dateStr) return apiError("Data é obrigatória");
  const date = parseDay(dateStr);
  if (!date) return apiError("Data inválida");

  const days = await prisma.workProviderDay.findMany({
    where: {
      date,
      workServiceProvider: { projectId: params.id },
    },
    include: {
      workServiceProvider: {
        include: { serviceProvider: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess(days);
}

// POST /api/v1/projects/[id]/service-providers/days
// Body: { workServiceProviderId, date }  → agenda o prestador naquele dia.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const workServiceProviderId = String(body.workServiceProviderId ?? "");
    const date = parseDay(String(body.date ?? ""));
    if (!workServiceProviderId) return apiError("Prestador é obrigatório");
    if (!date) return apiError("Data inválida");

    // Garante que o vínculo é mesmo desta obra, para não agendar prestador
    // de outra obra por id chutado.
    const link = await prisma.workServiceProvider.findFirst({
      where: { id: workServiceProviderId, projectId: params.id },
      select: { id: true },
    });
    if (!link) return apiError("Prestador não encontrado nesta obra", 404);

    const day = await prisma.workProviderDay.upsert({
      where: { workServiceProviderId_date: { workServiceProviderId, date } },
      create: { workServiceProviderId, date },
      update: {},
      include: {
        workServiceProvider: { include: { serviceProvider: true } },
      },
    });

    return apiSuccess(day);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao agendar prestador no dia", 500);
  }
}
