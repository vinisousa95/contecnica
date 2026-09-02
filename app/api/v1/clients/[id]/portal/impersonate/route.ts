import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import {
  createImpersonationToken,
  PORTAL_COOKIE_NAME,
} from "@/lib/portal-auth";

/**
 * "Ver como cliente": emite uma sessão de portal para o ADMIN abrir o portal do
 * cliente sem a senha dele.
 *
 * Só ADMIN. A sessão é marcada como impersonação (imp=true), o que a torna
 * somente-visualização — os endpoints que representam ato de vontade recusam.
 * Dura 1 hora. Quem entrou fica registrado no token (impBy) e no log.
 *
 * O cookie de portal tem nome diferente do de admin, então os dois convivem no
 * mesmo navegador: o admin continua logado no sistema e, nas rotas /portal, é
 * visto como o cliente.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Apenas administradores podem ver como cliente", 403);

  const portalUser = await prisma.clientUser.findFirst({
    where: { clientId: params.id },
    include: { client: { select: { name: true } } },
  });
  if (!portalUser) return apiError("Este cliente não tem acesso ao portal", 404);

  const token = await createImpersonationToken(
    {
      clientUserId: portalUser.id,
      clientId: portalUser.clientId,
      email: portalUser.email,
      name: portalUser.name,
    },
    session.userId
  );

  console.log(
    `[impersonate] admin ${session.email} (${session.userId}) abriu o portal como ${portalUser.email} (cliente ${portalUser.client.name})`
  );

  const res = NextResponse.json({ success: true, data: { redirectTo: "/portal/dashboard" } });
  res.cookies.set(PORTAL_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.APP_ENV !== "development",
    sameSite: "lax",
    maxAge: 60 * 60, // 1h, casa com a validade do token
    path: "/",
  });
  return res;
}
