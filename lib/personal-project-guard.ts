import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

/**
 * Guard das "Obras Pessoais" (dados financeiros pessoais do dono).
 *
 * Antes essas rotas só checavam `if (!session)`: qualquer usuário autenticado —
 * inclusive MANAGER, que o middleware não bloqueava neste caminho — lia e
 * escrevia as obras pessoais do dono. E as rotas aninhadas operavam no registro
 * filho apenas pelo ID, sem conferir a qual projeto ele pertencia (IDOR).
 *
 * Regra: só ADMIN, e só nos próprios projetos.
 */
export async function canAccessPersonalProject(
  session: SessionPayload | null,
  projectId: string
): Promise<boolean> {
  if (!session || session.role !== "ADMIN") return false;

  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, createdById: session.userId },
    select: { id: true },
  });

  return !!project;
}
