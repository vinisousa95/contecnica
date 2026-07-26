import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { validateBody } from "@/lib/api-validation";
import { obraLoginSchema } from "@/lib/validations";

// Proteção contra força bruta é aplicada centralmente no middleware
// (5 tentativas / 15 min por IP) — ver lib/rate-limit.ts.
export async function POST(request: NextRequest) {
  const parsed = await validateBody(request, obraLoginSchema);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: parsed.status });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await createToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  setSessionCookie(token);

  return NextResponse.json({ success: true, data: { name: user.name, role: user.role } });
}
