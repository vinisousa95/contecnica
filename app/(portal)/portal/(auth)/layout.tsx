import { getPortalSession, isImpersonation } from "@/lib/portal-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { portalOnboarding } from "@/lib/privacy";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalProvider } from "@/components/portal/portal-provider";
import { ImpersonationBanner } from "@/components/portal/impersonation-banner";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const clientUser = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    include: { client: { select: { name: true } } },
  });

  if (!clientUser || !clientUser.isActive) redirect("/portal/login");

  const impersonating = isImpersonation(session);

  // Trava do primeiro acesso: aceite da política e troca da senha genérica.
  // Aqui, e não no middleware, porque a decisão depende do banco e o middleware
  // roda no Edge (sem Prisma). Este layout é o único caminho para toda página
  // autenticada do portal, então barrar aqui cobre a navegação inteira.
  //
  // Impersonação (admin vendo como cliente) NÃO cai na trava: o admin não deve
  // aceitar termos nem trocar a senha no lugar do cliente. Ele vê o portal como
  // está, e as ações ficam bloqueadas na API.
  if (!impersonating && portalOnboarding(clientUser).pending) redirect("/portal/primeiro-acesso");

  const user = {
    name: clientUser.name,
    email: clientUser.email,
    clientName: clientUser.client.name,
  };

  return (
    <PortalProvider>
      <div className="flex min-h-screen bg-gray-50">
        <PortalSidebar user={user} />
        <main className="flex-1 overflow-auto">
          {impersonating && <ImpersonationBanner clientName={clientUser.client.name} />}
          <div className="p-6 max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </PortalProvider>
  );
}
