import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
