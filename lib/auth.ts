import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido. Configure a variável de ambiente.");
}

const COOKIE_NAME = "contecnica_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  // Bearer token (mobile apps)
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return verifyToken(auth.slice(7));
  }
  // Cookie (web)
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
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
