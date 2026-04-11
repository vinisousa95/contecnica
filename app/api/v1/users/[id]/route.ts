import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN" && session.userId !== params.id) return apiError("Sem permissão", 403);

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const updateData: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone,
      isActive: parsed.data.isActive,
    };

    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, phone: true },
    });

    return apiSuccess(user);
  } catch {
    return apiError("Erro ao atualizar usuário", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);
  if (session.userId === params.id) return apiError("Não é possível excluir seu próprio usuário");

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return apiSuccess({ message: "Usuário desativado com sucesso" });
  } catch {
    return apiError("Erro ao desativar usuário", 500);
  }
}
