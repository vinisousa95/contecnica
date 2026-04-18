"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { usePortalUpdates } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { Clock, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PortalAndamentoPage() {
  const { projectId } = usePortal();
  const { data: updates = [], isLoading } = usePortalUpdates(projectId ?? "");

  if (!projectId || isLoading) return <LoadingPage message="Carregando andamento..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Andamento da Obra</h1>
        <p className="text-sm text-gray-500 mt-0.5">Linha do tempo de atualizações</p>
      </div>

      {updates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma atualização ainda</p>
          <p className="text-sm text-gray-400 mt-1">As atualizações serão exibidas aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

            <div className="space-y-0">
              {updates.map((update: any, i: number) => (
                <div key={update.id} className="relative flex gap-5 pb-8 last:pb-0">
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${i === 0 ? "bg-[#EA580C]" : "bg-gray-200"}`}>
                      {i === 0 ? (
                        <Clock className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{update.title}</p>
                        {update.description && (
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{update.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
