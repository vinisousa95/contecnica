import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { validateBody } from "@/lib/api-validation";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Troca de senha pelo próprio cliente.
 *
 * Serve tanto para o primeiro acesso obrigatório (quando a Contécnica definiu uma
 * senha genérica) quanto para troca voluntária depois.
 *
 * A senha atual é exigida nos dois casos. No primeiro acesso ela é a genérica que
 * o cliente acabou de digitar no login, então não é atrito real — e evita que uma
 * sessão esquecida num computador emprestado troque a senha de quem passar ali.
 */
const schema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "A nova senha precisa de ao menos 8 caracteres").max(200),
  })
  .strict()
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["newPassword"],
  });

export async function POST(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const parsed = await validateBody(request, schema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) return apiError("Não autorizado", 401);

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return apiError("Senha atual incorreta", 400);

  await prisma.clientUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      // Trocou: a obrigação de trocar sai. Se a Contécnica redefinir a senha
      // outra vez, volta a valer.
      mustChangePassword: false,
    },
  });

  return apiSuccess({ message: "Senha alterada" });
}
