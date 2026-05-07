import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: check whether the current user has a finance PIN set
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ required: false });

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

  const body = await request.json();
  const { pin } = body as { pin?: string };

  if (!pin) return NextResponse.json({ success: false });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { financePin: true },
  });

  if (!user?.financePin) return NextResponse.json({ success: true });

  const match = await bcrypt.compare(pin, user.financePin);
  return NextResponse.json({ success: match });
}
