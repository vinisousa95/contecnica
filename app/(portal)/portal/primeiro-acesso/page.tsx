import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { portalOnboarding, PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { PrimeiroAcessoFlow } from "@/components/portal/primeiro-acesso-flow";

/**
 * Primeiro acesso: aceite da política e troca da senha genérica.
 *
 * Fica FORA do grupo (auth) de propósito. O layout de lá redireciona para cá
 * quando há pendência — se esta página usasse aquele layout, o redirecionamento
 * entraria em laço.
 */
export default async function PrimeiroAcessoPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const user = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    select: {
      name: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      privacyAcceptedAt: true,
      privacyVersion: true,
    },
  });
  if (!user || !user.isActive) redirect("/portal/login");

  const onboarding = portalOnboarding(user);
  // Nada pendente: não faz sentido ficar nesta tela.
  if (!onboarding.pending) redirect("/portal/dashboard");

  return (
    <PrimeiroAcessoFlow
      name={user.name}
      email={user.email}
      needsPrivacy={onboarding.needsPrivacy}
      mustChangePassword={onboarding.mustChangePassword}
      privacyVersion={PRIVACY_POLICY_VERSION}
    />
  );
}
