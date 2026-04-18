import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "contecnica-secret-fallback"
);

const PORTAL_COOKIE = "contecnica_portal_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface PortalSessionPayload {
  clientUserId: string;
  clientId: string;
  email: string;
  name: string;
}

export async function createPortalToken(payload: PortalSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload, type: "portal" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
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
  const cookieStore = cookies();
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
  const cookieStore = cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearPortalSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(PORTAL_COOKIE);
}

export const PORTAL_COOKIE_NAME = PORTAL_COOKIE;
