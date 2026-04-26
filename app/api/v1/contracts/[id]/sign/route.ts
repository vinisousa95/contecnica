import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const { signedFileUrl } = body;

  if (!signedFileUrl) return apiError("URL do arquivo assinado obrigatória");

  try {
    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: {
        signedFileUrl,
        signedAt: new Date(),
        status: "SIGNED",
      },
    });
    return apiSuccess({ ...contract, totalAmount: Number(contract.totalAmount) });
  } catch {
    return apiError("Contrato não encontrado", 404);
  }
}
