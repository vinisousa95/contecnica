import { prisma } from "@/lib/prisma";
import { portalOnboarding } from "@/lib/privacy";

/**
 * Barra ações do portal enquanto o cliente não concluiu o primeiro acesso.
 *
 * Aplicado nas rotas que representam ato de vontade — aceitar ou recusar serviço
 * extra, assinar contrato, iniciar pagamento. Barrar só na tela não bastaria:
 * essas são exatamente as ações que não devem acontecer antes do aceite da
 * política, e continuariam alcançáveis por quem chamasse a API direto.
 *
 * Leitura de dados não é barrada — o cliente ver a própria obra enquanto troca a
 * senha não gera consequência jurídica, e travar tudo só dificultaria o suporte.
 *
 * @returns `null` quando pode seguir, ou a mensagem do impedimento.
 */
export async function blockedByOnboarding(clientUserId: string): Promise<string | null> {
  const user = await prisma.clientUser.findUnique({
    where: { id: clientUserId },
    select: { mustChangePassword: true, privacyAcceptedAt: true, privacyVersion: true },
  });
  if (!user) return "Não autorizado";

  const status = portalOnboarding(user);
  if (!status.pending) return null;

  if (status.needsPrivacy) {
    return "É necessário aceitar a Política de Privacidade antes de continuar. Recarregue o portal.";
  }
  return "É necessário definir uma nova senha antes de continuar. Recarregue o portal.";
}
