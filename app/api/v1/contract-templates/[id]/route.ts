import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).optional(),
  body: z.string().min(10).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const template = await prisma.contractTemplate.findUnique({ where: { id: params.id } });
  if (!template) return apiError("Modelo não encontrado", 404);

  return apiSuccess(template);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  try {
    const template = await prisma.contractTemplate.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return apiSuccess(template);
  } catch {
    return apiError("Modelo não encontrado", 404);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const used = await prisma.contract.count({ where: { templateId: params.id } });
  if (used > 0) return apiError(`Não é possível excluir: modelo usado em ${used} contrato(s).`);

  try {
    await prisma.contractTemplate.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Modelo excluído" });
  } catch {
    return apiError("Modelo não encontrado", 404);
  }
}
