"use client";

import { useQuery } from "@tanstack/react-query";
import { usePortal } from "@/components/portal/portal-provider";
import { LoadingPage } from "@/components/ui/loading";
import { Users, Car, Calendar } from "lucide-react";

const STATUS_PT: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function PortalEquipePage() {
  const { projectId } = usePortal();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["portal-team", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/v1/projects/${projectId}/team`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      return json.data as any[];
    },
    enabled: !!projectId,
  });

  if (!projectId || isLoading) return <LoadingPage message="Carregando equipe..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Equipe na Obra</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Funcionários e veículos que estão sendo enviados para sua obra
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">Nenhum deslocamento agendado</p>
          <p className="text-xs text-gray-400 mt-1">
            Quando a equipe for agendada, os dados aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {new Date(a.date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    {a.departureTime && ` · ${a.departureTime}`}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_PT[a.status] ?? a.status}
                </span>
              </div>

              {/* Employee */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#EA580C]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-[#EA580C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{a.employee.name}</p>
                  {a.employee.role && <p className="text-xs text-gray-500">{a.employee.role}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {a.employee.cpf && (
                      <span className="text-xs text-gray-500">CPF: {a.employee.cpf}</span>
                    )}
                    {a.employee.rg && (
                      <span className="text-xs text-gray-500">RG: {a.employee.rg}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle */}
              {a.vehicle && (
                <div className="flex items-start gap-3 pt-3 border-t border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.vehicle.name}</p>
                    <p className="text-xs text-gray-500">
                      {[a.vehicle.model, a.vehicle.color, a.vehicle.plate]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              )}

              {a.notes && (
                <p className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 italic">
                  {a.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
