import { SignJWT, jwtVerify } from "jose";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { NextRequest } from "next/server";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido. Configure a variável de ambiente.");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const PORTAL_COOKIE = "contecnica_portal_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface PortalSessionPayload {
  clientUserId: string;
  clientId: string;
  email: string;
  name: string;
  /**
   * Sessão de impersonação: um ADMIN vendo o portal como o cliente, sem a senha
   * dele. Marca a sessão como somente-visualização — atos de vontade (pagar,
   * aceitar termos, trocar senha, aprovar serviço) são bloqueados, para o admin
   * não agir no lugar do cliente. `impBy` guarda quem entrou, para auditoria.
   */
  imp?: boolean;
  impBy?: string;
}

export async function createPortalToken(payload: PortalSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload, type: "portal" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Token de impersonação (admin vendo como cliente). Vida curta — 1 hora — para
 * não deixar uma sessão de cliente pendurada no navegador do admin por 30 dias.
 */
export async function createImpersonationToken(
  payload: PortalSessionPayload,
  adminUserId: string
): Promise<string> {
  return await new SignJWT({ ...payload, type: "portal", imp: true, impBy: adminUserId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

/** A sessão é de impersonação (admin vendo como cliente)? */
export function isImpersonation(session: PortalSessionPayload | null): boolean {
  return !!session?.imp;
}

export async function verifyPortalToken(token: string): Promise<PortalSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if ((payload as any).type !== "portal") return null;
    return payload as unknown as PortalSessionPayload;
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<PortalSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalToken(token);
}

export async function getPortalSessionFromRequest(req: NextRequest): Promise<PortalSessionPayload | null> {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalToken(token);
}

export function setPortalSessionCookie(token: string) {
  const cookieStore = (cookies() as unknown as UnsafeUnwrappedCookies);
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    // "!== development" e não "=== production": se APP_ENV faltar no servidor,
    // o cookie nasce Secure mesmo assim (fail-safe). Era o único lugar com a
    // condição invertida em relação a lib/auth.ts.
    secure: process.env.APP_ENV !== "development",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearPortalSessionCookie() {
  const cookieStore = (cookies() as unknown as UnsafeUnwrappedCookies);
  cookieStore.delete(PORTAL_COOKIE);
}

export const PORTAL_COOKIE_NAME = PORTAL_COOKIE;
