import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
}).strict();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({
    where: { clientId: params.id },
    select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  return apiSuccess(portalUser);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return apiError("Cliente não encontrado", 404);

  const existing = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (existing) return apiError("Este cliente já possui acesso ao portal", 400);

  const body = await request.json();
  const data = createSchema.parse(body);

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (!portalUser) return apiError("Acesso ao portal não encontrado", 404);

  const body = await request.json();
  const data = updateSchema.parse(body);

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const updated = await prisma.clientUser.update({
    where: { id: portalUser.id },
    data: updateData,
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  return apiSuccess(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const portalUser = await prisma.clientUser.findFirst({ where: { clientId: params.id } });
  if (!portalUser) return apiError("Acesso não encontrado", 404);

  await prisma.clientUser.delete({ where: { id: portalUser.id } });

  return apiSuccess({ message: "Acesso removido" });
}
