import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
  amount: z.string().min(1, "Valor é obrigatório"),
  // Foto do que será executado. Caminho devolvido por /api/v1/upload — não
  // aceitamos URL externa, para não virar vetor de conteúdo de terceiros no
  // portal do cliente.
  photoUrl: z
    .string()
    .regex(/^\/api\/v1\/uploads\/photos\/[A-Za-z0-9._-]+$/, "Foto inválida")
    .optional()
    .nullable(),
}).strict();

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const services = await prisma.extraService.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(services.map((s) => ({ ...s, amount: Number(s.amount) })));
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const service = await prisma.extraService.create({
    data: {
      projectId: params.id,
      name: parsed.data.name,
      description: parsed.data.description,
      requestedBy: parsed.data.requestedBy ?? null,
      amount: parsed.data.amount,
      photoUrl: parsed.data.photoUrl ?? null,
    },
  });

  return apiSuccess({ ...service, amount: Number(service.amount) });
}
