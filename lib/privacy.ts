/**
 * Versão vigente da política de privacidade.
 *
 * Ao mudar o TEXTO da política de forma relevante, incremente esta data: todo
 * cliente volta a ver a tela de aceite no próximo acesso. Aceite antigo continua
 * registrado com a versão dele, que é o que permite mostrar depois a QUE cada
 * cliente consentiu — sem isso o registro de aceite não prova nada.
 *
 * O texto vive em app/(portal)/portal/privacidade/page.tsx.
 */
export const PRIVACY_POLICY_VERSION = "2026-08-06";

/** Precisa aceitar (ou reaceitar) a política? */
export function needsPrivacyAcceptance(user: {
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
}): boolean {
  if (!user.privacyAcceptedAt) return true;
  return user.privacyVersion !== PRIVACY_POLICY_VERSION;
}

export interface PortalOnboarding {
  mustChangePassword: boolean;
  needsPrivacy: boolean;
  pending: boolean;
}

/**
 * O que falta o cliente resolver antes de usar o portal.
 *
 * Usado em dois lugares: no layout do portal (que barra a navegação) e nas rotas
 * de API que representam ato de vontade — aceitar serviço extra, assinar
 * contrato, iniciar pagamento. Barrar só na tela deixaria essas ações
 * alcançáveis por quem chamasse a API direto, e são justamente as que não devem
 * acontecer antes do aceite.
 */
export function portalOnboarding(user: {
  mustChangePassword: boolean;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
}): PortalOnboarding {
  const needsPrivacy = needsPrivacyAcceptance(user);
  return {
    mustChangePassword: user.mustChangePassword,
    needsPrivacy,
    pending: user.mustChangePassword || needsPrivacy,
  };
}
