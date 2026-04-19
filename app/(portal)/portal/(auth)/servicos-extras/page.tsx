"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePortal } from "@/components/portal/portal-provider";
import { LoadingPage } from "@/components/ui/loading";
import { formatCurrency } from "@/lib/utils";
import { Wrench, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function ServicosExtrasPage() {
  const { projectId } = usePortal();
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["portal-extra-services", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/v1/projects/${projectId}/extra-services`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      return json.data as any[];
    },
    enabled: !!projectId,
  });

  const handleAction = async (serviceId: string, action: "accept" | "reject") => {
    setActionLoading(serviceId + action);
    setActionError(null);
    try {
      const res = await fetch(`/api/portal/v1/extra-services/${serviceId}/${action}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao processar");
      qc.invalidateQueries({ queryKey: ["portal-extra-services", projectId] });
    } catch (e: any) {
      setActionError(e.message === "Failed to fetch" ? "Erro de conexão. Recarregue a página e tente novamente." : e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!projectId || isLoading) return <LoadingPage message="Carregando serviços extras..." />;

  const pending = services.filter((s: any) => s.status === "PENDING_APPROVAL");
  const accepted = services.filter((s: any) => s.status === "ACCEPTED");
  const rejected = services.filter((s: any) => s.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Serviços Extras</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Serviços adicionais solicitados pela Contécnica após o orçamento inicial
        </p>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {services.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center">
          <Wrench className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum serviço extra solicitado ainda</p>
          <p className="text-xs text-gray-400 mt-1">Quando a Contécnica adicionar serviços extras, eles aparecerão aqui.</p>
        </div>
      )}

      {/* Pending — needs client action */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aguardando sua aprovação ({pending.length})
          </h2>
          {pending.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
                  {s.description && (
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  )}
                  <p className="text-xl font-bold text-gray-900 mt-3">
                    {formatCurrency(s.amount)}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 mt-1">
                  <button
                    onClick={() => handleAction(s.id, "reject")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                  <button
                    onClick={() => handleAction(s.id, "accept")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aceitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Aceitos ({accepted.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {accepted.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(s.amount)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.paidAt ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {s.paidAt ? "Pago" : "Aguardando pagamento"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Recusados ({rejected.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {rejected.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-400 line-through">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-300 mt-0.5">{s.description}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-gray-400">{formatCurrency(s.amount)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                    <XCircle className="h-3 w-3" />
                    Recusado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
