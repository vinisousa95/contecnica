import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(
    `obra-login:${getClientIp(request)}`,
    10,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfter / 60)} minutos.` },
      { status: 429 }
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await createToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
  setSessionCookie(token);

  return NextResponse.json({ success: true, data: { name: user.name, role: user.role } });
}
