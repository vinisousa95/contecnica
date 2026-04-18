import { getPortalSession } from "@/lib/portal-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalProvider } from "@/components/portal/portal-provider";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const clientUser = await prisma.clientUser.findUnique({
    where: { id: session.clientUserId },
    include: { client: { select: { name: true } } },
  });

  if (!clientUser || !clientUser.isActive) redirect("/portal/login");

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
          <div className="p-6 max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </PortalProvider>
  );
}
