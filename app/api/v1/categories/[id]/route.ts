import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const exists = await prisma.category.findFirst({
      where: { name: parsed.data.name, NOT: { id: params.id } },
    });
    if (exists) return apiError("Já existe uma categoria com este nome");

    const category = await prisma.category.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return apiSuccess(category);
  } catch {
    return apiError("Erro ao atualizar categoria", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Soft delete — just deactivate
  try {
    await prisma.category.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return apiSuccess({ message: "Categoria desativada com sucesso" });
  } catch {
    return apiError("Erro ao desativar categoria", 500);
  }
}
