import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      phone: true, createdAt: true,
    },
  });

  return apiSuccess(users);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) return apiError("E-mail já cadastrado");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        phone: parsed.data.phone,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return apiSuccess(user);
  } catch {
    return apiError("Erro ao criar usuário", 500);
  }
}
