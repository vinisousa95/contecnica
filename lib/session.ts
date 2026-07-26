import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME_EXPORT, type SessionPayload } from "@/lib/auth";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Sessão validada contra o banco (runtime Node)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Este módulo existe separado de `lib/auth.ts` de propósito: o `middleware.ts`
 * roda no Edge runtime e importa de `lib/auth.ts`. Se o Prisma entrasse lá, o
 * bundle do middleware quebraria. Então `lib/auth.ts` fica só com JWT/cookie
 * (Edge-safe) e a validação que precisa do banco vive aqui.
 *
 * Além da assinatura do JWT, aqui verificamos a cada requisição:
 *   1. o usuário ainda existe e está ativo;
 *   2. o `tokenVersion` do token bate com o do banco — trocar a senha ou
 *      desativar o usuário incrementa esse contador e invalida na hora todos
 *      os tokens já emitidos (antes eles valiam os 7 dias inteiros);
 *   3. o `role` vem do banco, não do JWT — mudança de perfil vale de imediato.
 */

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.cookies.get(COOKIE_NAME_EXPORT)?.value ?? null;
}

/**
 * Cache curto do estado do usuário, para não fazer uma query por requisição.
 *
 * O TTL é o atraso máximo com que uma revogação passa a valer. 15s mantém a
 * revogação praticamente imediata do ponto de vista de um ataque, e derruba
 * quase toda a carga extra no banco (uma página do dashboard dispara muitas
 * requisições em paralelo, que passam a compartilhar a mesma leitura).
 *
 * `revokeUserSessions` e as rotas que alteram usuário invalidam a entrada na
 * hora, então o fluxo normal do app não espera o TTL.
 */
const USER_CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 5_000;

type CachedUser = { isActive: boolean; role: string; tokenVersion: number };
const userCache = new Map<string, { user: CachedUser | null; expiresAt: number }>();

/** Remove a entrada de cache de um usuário (troca de senha, perfil, desativação). */
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

async function loadUser(userId: string): Promise<CachedUser | null> {
  const now = Date.now();
  const hit = userCache.get(userId);
  if (hit && now < hit.expiresAt) return hit.user;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, role: true, tokenVersion: true },
  });

  if (userCache.size > MAX_CACHE_ENTRIES) {
    Array.from(userCache.entries()).forEach(([k, v]) => {
      if (now >= v.expiresAt) userCache.delete(k);
    });
  }

  userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
  return user;
}

/** Revalida o payload do JWT contra o estado atual do usuário no banco. */
async function revalidate(payload: SessionPayload | null): Promise<SessionPayload | null> {
  if (!payload?.userId) return null;

  const user = await loadUser(payload.userId);

  if (!user || !user.isActive) return null;
  if ((payload.tokenVersion ?? 0) !== user.tokenVersion) return null;

  // role do banco vence o do token
  return { ...payload, role: user.role };
}

/** Sessão a partir de uma requisição de API (cookie ou Bearer do app mobile). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = extractToken(req);
  if (!token) return null;
  return revalidate(await verifyToken(token));
}

/** Sessão a partir do cookie, para Server Components. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME_EXPORT)?.value;
  if (!token) return null;
  return revalidate(await verifyToken(token));
}

/**
 * Invalida todas as sessões de um usuário. Chame ao trocar senha, desativar a
 * conta ou alterar o perfil.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  invalidateUserCache(userId);
}
