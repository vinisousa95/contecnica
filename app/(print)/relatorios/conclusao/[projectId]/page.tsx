import { notFound } from "next/navigation";
import { getCompletionReportData } from "@/lib/completion-report";
import { CompletionReportView } from "@/components/reports/completion-report-view";

// Relatório de conclusão — acesso do admin. A checagem de sessão admin fica no
// layout do grupo (print). Mostra a MESMA versão cliente que o portal entrega.
export default async function RelatorioConclusaoAdmin(props: {
  params: Promise<{ projectId: string }>;
}) {
  const params = await props.params;
  const data = await getCompletionReportData(params.projectId);
  if (!data) notFound();
  return <CompletionReportView data={data} />;
}
