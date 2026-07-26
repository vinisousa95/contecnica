import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const pinSchema = z.object({ pin: z.string().min(1).max(20) }).strict();

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

  const parsed = pinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 });
  const { pin } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { financePin: true },
  });

  if (!user?.financePin) return NextResponse.json({ success: true });

  const match = await bcrypt.compare(pin, user.financePin);
  return NextResponse.json({ success: match });
}
