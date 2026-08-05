import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { validateBody } from "@/lib/api-validation";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
}).strict();

/**
 * O e-mail daqui é a CREDENCIAL de login do portal, guardada em ClientUser —
 * coisa diferente do `Client.email`, que é o contato do cadastro. Trocar um não
 * troca o outro, e é de propósito: há cliente que acompanha a obra por um
 * endereço e recebe cobrança em outro.
 *
 * Antes não havia como alterar esta credencial por tela nenhuma: o campo não
 * existia aqui. A única saída era remover o acesso e criar outro, o que perde a
 * data de criação e o histórico de último acesso.
 */
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email("E-mail inválido").optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({
    where: { clientId: params.id },
    select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  return apiSuccess(portalUser);
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return apiError("Cliente não encontrado", 404);

  const existing = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (existing) return apiError("Este cliente já possui acesso ao portal", 400);

  const parsedCreate = await validateBody(request, createSchema);
  if (!parsedCreate.ok) return apiError(parsedCreate.error, parsedCreate.status);
  const data = parsedCreate.data;

  const emailTaken = await prisma.clientUser.findUnique({ where: { email: data.email } });
  if (emailTaken) return apiError("E-mail já cadastrado", 400);

  const passwordHash = await bcrypt.hash(data.password, 12);

  const clientUser = await prisma.clientUser.create({
    data: {
      clientId: params.id,
      name: data.name,
      email: data.email,
      passwordHash,
      isActive: true,
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  return apiSuccess(clientUser);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (!portalUser) return apiError("Acesso ao portal não encontrado", 404);

  const parsed = await validateBody(request, updateSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const data = parsed.data;

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  if (data.email && data.email !== portalUser.email) {
    // O e-mail é único entre todos os logins de portal — inclusive de outros
    // clientes. Checar antes devolve mensagem clara em vez do erro do banco.
    const taken = await prisma.clientUser.findUnique({ where: { email: data.email } });
    if (taken) return apiError("Este e-mail já é usado por outro acesso ao portal", 400);
    updateData.email = data.email;
  }

  const updated = await prisma.clientUser.update({
    where: { id: portalUser.id },
    data: updateData,
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  return apiSuccess(updated);
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (!portalUser) return apiError("Acesso não encontrado", 404);

  await prisma.clientUser.delete({ where: { id: portalUser.id } });

  return apiSuccess({ message: "Acesso removido" });
}
