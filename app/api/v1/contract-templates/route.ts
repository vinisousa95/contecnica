import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  body: z.string().min(10, "Conteúdo obrigatório"),
  isActive: z.boolean().default(true),
}).strict();

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const templates = await prisma.contractTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const template = await prisma.contractTemplate.create({ data: parsed.data });
  return apiSuccess(template);
}
