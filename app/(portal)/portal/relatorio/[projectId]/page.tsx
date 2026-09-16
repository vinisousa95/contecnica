import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { getCompletionReportData } from "@/lib/completion-report";
import { CompletionReportView } from "@/components/reports/completion-report-view";

// Relatório de conclusão que o CLIENTE baixa pelo portal. Fica fora do layout
// (auth) de propósito, para o documento sair limpo (sem a barra lateral).
// Escopo: só a obra do próprio cliente.
export default async function RelatorioConclusaoPortal(props: {
  params: Promise<{ projectId: string }>;
}) {
  const params = await props.params;
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const project = await prisma.project.findFirst({
    where: { id: params.projectId, clientId: session.clientId },
    select: { id: true },
  });
  if (!project) notFound();

  const data = await getCompletionReportData(params.projectId);
  if (!data) notFound();
  return <CompletionReportView data={data} />;
}
