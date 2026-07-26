import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const isAdmin = session.role === "ADMIN";
  const isSelf = session.userId === params.id;
  if (!isAdmin && !isSelf) return apiError("Sem permissão", 403);

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    // Campos que o próprio usuário pode alterar em si mesmo.
    const updateData: Record<string, unknown> = {
      name: parsed.data.name,
      phone: parsed.data.phone,
    };

    // ESCALADA DE PRIVILÉGIO: `role`, `isActive` e `email` só podem ser
    // alterados por ADMIN. Antes eram gravados direto do body, então um
    // MANAGER/EMPLOYEE editando o próprio perfil podia se promover a ADMIN.
    if (isAdmin) {
      updateData.email = parsed.data.email;
      updateData.role = parsed.data.role;
      updateData.isActive = parsed.data.isActive;
    } else if (parsed.data.role && parsed.data.role !== session.role) {
      return apiError("Sem permissão para alterar o perfil de acesso", 403);
    }

    const passwordChanged = !!parsed.data.password;
    if (passwordChanged) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password!, 12);
    }
    if (parsed.data.financePin) {
      updateData.financePin = await bcrypt.hash(parsed.data.financePin, 10);
    }

    // Revoga as sessões existentes quando algo que afeta autenticação ou
    // autorização muda — senão o token antigo continuaria válido por 7 dias.
    const roleChanged = isAdmin && parsed.data.role !== undefined;
    const deactivated = isAdmin && parsed.data.isActive === false;
    if (passwordChanged || roleChanged || deactivated) {
      updateData.tokenVersion = { increment: 1 };
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
      // tokenVersion: derruba as sessões ativas do usuário desativado.
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    return apiSuccess({ message: "Usuário desativado com sucesso" });
  } catch {
    return apiError("Erro ao desativar usuário", 500);
  }
}
