import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const provider = await prisma.serviceProvider.update({
      where: { id: params.id },
      data: { status: "INACTIVE" },
    });
    return apiSuccess(provider);
  } catch {
    return apiError("Erro ao inativar prestador", 500);
  }
}
