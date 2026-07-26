import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { createPortalToken, setPortalSessionCookie } from "@/lib/portal-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Proteção contra força bruta é aplicada centralmente no middleware
// (5 tentativas / 15 min por IP) — ver lib/rate-limit.ts.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const clientUser = await prisma.clientUser.findUnique({
      where: { email: data.email },
      include: { client: true },
    });

    if (!clientUser || !clientUser.isActive) {
      return apiError("E-mail ou senha incorretos.", 401);
    }

    const valid = await bcrypt.compare(data.password, clientUser.passwordHash);
    if (!valid) return apiError("E-mail ou senha incorretos.", 401);

    await prisma.clientUser.update({
      where: { id: clientUser.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createPortalToken({
      clientUserId: clientUser.id,
      clientId: clientUser.clientId,
      email: clientUser.email,
      name: clientUser.name,
    });

    setPortalSessionCookie(token);

    return apiSuccess({
      name: clientUser.name,
      email: clientUser.email,
      clientName: clientUser.client.name,
    });
  } catch {
    return apiError("Dados inválidos", 400);
  }
}
