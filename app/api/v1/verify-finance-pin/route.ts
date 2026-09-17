import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const pinSchema = z.object({ pin: z.string().min(1).max(20) }).strict();

// Proteção contra força bruta do PIN, na própria rota: conta só as tentativas
// ERRADAS, por usuário. Acertar zera o contador. Assim bloquear/entrar várias
// vezes com o PIN certo nunca trava — só uma sequência de PINs errados trava.
// (No middleware isso não daria: lá toda requisição conta, inclusive as certas.)
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; resetAt: number }>();

/** Quanto tempo (ms) ainda falta de bloqueio, ou 0 se liberado. */
function lockedForMs(key: string): number {
  const rec = fails.get(key);
  if (!rec) return 0;
  if (Date.now() > rec.resetAt) {
    fails.delete(key);
    return 0;
  }
  return rec.count >= MAX_FAILS ? rec.resetAt - Date.now() : 0;
}

function registerFail(key: string) {
  const now = Date.now();
  const rec = fails.get(key);
  if (!rec || now > rec.resetAt) {
    fails.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

// GET: check whether the current user has a finance PIN set
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ required: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { financePin: true },
  });

  return NextResponse.json({ required: !!user?.financePin });
}

// POST: verify the supplied PIN for the current user
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const key = session.userId;
  const locked = lockedForMs(key);
  if (locked > 0) {
    return NextResponse.json(
      { success: false, locked: true, retryAfterMinutes: Math.ceil(locked / 60000) },
      { status: 429 }
    );
  }

  const parsed = pinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 });
  const { pin } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { financePin: true },
  });

  // Sem PIN cadastrado: nada a proteger.
  if (!user?.financePin) {
    fails.delete(key);
    return NextResponse.json({ success: true });
  }

  const match = await bcrypt.compare(pin, user.financePin);
  if (match) {
    fails.delete(key); // acertou: zera o contador de erros
    return NextResponse.json({ success: true });
  }

  registerFail(key);
  return NextResponse.json({ success: false });
}
