import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serviceProviderSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const provider = await prisma.serviceProvider.findUnique({
    where: { id: params.id },
    include: {
      workLinks: {
        include: {
          project: { select: { id: true, name: true, status: true } },
          expense: { select: { id: true, status: true, amount: true, paymentDate: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!provider) return apiError("Prestador não encontrado", 404);
  return apiSuccess(provider);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = serviceProviderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { birthDate, ...rest } = parsed.data;
    const provider = await prisma.serviceProvider.update({
      where: { id: params.id },
      data: { ...rest, birthDate: birthDate ? new Date(birthDate) : null },
    });

    return apiSuccess(provider);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Prestador não encontrado", 404);
    return apiError("Erro ao atualizar prestador", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.serviceProvider.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Prestador excluído" });
  } catch {
    return apiError("Erro ao excluir prestador", 500);
  }
}
