import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { validateBody } from "@/lib/api-validation";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { impersonationBlock } from "@/lib/portal-guard";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { z } from "zod";

/**
 * Registro do aceite da política de privacidade (LGPD).
 *
 * A versão gravada é a do servidor, não a que o cliente manda: se o texto mudar
 * entre o carregamento da tela e o clique, aceitar uma versão que ele não leu
 * seria pior que pedir de novo. O cliente informa qual versão está vendo e, se
 * não for a vigente, a resposta pede recarregar.
 */
const schema = z
  .object({
    accepted: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar para continuar" }) }),
    version: z.string().min(1),
  })
  .strict();

export async function POST(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const impBlock = impersonationBlock(session);
  if (impBlock) return apiError(impBlock, 403);

  const parsed = await validateBody(request, schema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);

  if (parsed.data.version !== PRIVACY_POLICY_VERSION) {
    return apiError("A política foi atualizada. Recarregue a página para ler a versão vigente.", 409);
  }

  const user = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) return apiError("Não autorizado", 401);

  await prisma.clientUser.update({
    where: { id: user.id },
    data: { privacyAcceptedAt: new Date(), privacyVersion: PRIVACY_POLICY_VERSION },
  });

  return apiSuccess({ acceptedAt: new Date(), version: PRIVACY_POLICY_VERSION });
}
