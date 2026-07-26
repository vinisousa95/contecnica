import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido. Configure a variável de ambiente.");
}

const COOKIE_NAME = "contecnica_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Cookie seguro por padrão: só sai do modo Secure quando explicitamente em
 * desenvolvimento. Antes era `APP_ENV === "production"`, então esquecer de
 * definir APP_ENV no servidor fazia o cookie de sessão trafegar em HTTP puro.
 */
export const USE_SECURE_COOKIES = process.env.APP_ENV !== "development";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  /** Versão do token no momento da emissão — ver User.tokenVersion. */
  tokenVersion?: number;
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    // Reject portal tokens: they are signed with the same secret but must never
    // grant admin/internal access. Admin routes only accept admin sessions.
    if ((payload as any).type === "portal") return null;
    // A valid admin session must carry userId + role; anything else is malformed.
    if (!(payload as any).userId || !(payload as any).role) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * `getSession` / `getSessionFromRequest` moram em `lib/session.ts`, não aqui.
 * Este módulo é importado pelo middleware (Edge runtime) e por isso não pode
 * depender do Prisma — e a validação de sessão precisa do banco para conferir
 * `tokenVersion` e `isActive`. Use sempre `@/lib/session` nas rotas.
 */

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
