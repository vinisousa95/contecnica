import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

/**
 * Marca um contrato como assinado (fluxo administrativo).
 *
 * Antes: qualquer sessão autenticada podia marcar qualquer contrato como
 * assinado, e `signedFileUrl` era uma string arbitrária — inclusive uma URL
 * externa, depois exibida como se fosse o contrato assinado.
 */
const schema = z.object({
  // Só caminho interno de upload: bloqueia URL absoluta e path traversal.
  signedFileUrl: z
    .string()
    .trim()
    .min(1, "URL do arquivo assinado obrigatória")
    .regex(
      /^\/(api\/v1\/)?uploads\/[A-Za-z0-9._/-]+$/,
      "URL inválida: use um caminho de upload interno"
    )
    .refine((v) => !v.includes(".."), "URL inválida"),
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  try {
    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: {
        signedFileUrl: parsed.data.signedFileUrl,
        signedAt: new Date(),
        status: "SIGNED",
      },
    });
    return apiSuccess({ ...contract, totalAmount: Number(contract.totalAmount) });
  } catch {
    return apiError("Contrato não encontrado", 404);
  }
}
