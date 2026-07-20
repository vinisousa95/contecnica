import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Brute-force protection: max 10 attempts per IP per 15 minutes.
    const { allowed, retryAfter } = rateLimit(
      `login:${getClientIp(request)}`,
      10,
      15 * 60 * 1000
    );
    if (!allowed) {
      return apiError(
        `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfter / 60)} minutos.`,
        429
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Dados inválidos: " + parsed.error.errors[0].message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return apiError("Credenciais inválidas", 401);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return apiError("Credenciais inválidas", 401);
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = apiSuccess({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set cookie directly on response
    response.headers.set(
      "Set-Cookie",
      `contecnica_session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${
        process.env.APP_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Erro interno do servidor", 500);
  }
}
