"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePortal } from "@/components/portal/portal-provider";
import { usePortalProject } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { MapPin, Calendar, FileText, HardHat, Wrench, CheckCircle2, XCircle, Clock, Users, Car } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em Andamento",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ExtraServicesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: services = [], isLoading, refetch } = useQuery({
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
    try {
      const res = await fetch(`/api/portal/v1/extra-services/${serviceId}/${action}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      qc.invalidateQueries({ queryKey: ["portal-extra-services", projectId] });
      refetch();
    } catch {
      // silently fail — user can retry
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return null;
  if (services.length === 0) return null;

  const pending = services.filter((s: any) => s.status === "PENDING_APPROVAL");
  const accepted = services.filter((s: any) => s.status === "ACCEPTED");
  const rejected = services.filter((s: any) => s.status === "REJECTED");

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-[#EA580C]" />
        Serviços Extras
      </h2>

      {/* Pending — needs action */}
      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Aguardando sua aprovação</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{s.name}</h3>
                  {s.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
                  )}
                  <p className="text-lg font-bold text-gray-900 mt-2">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.amount)}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(s.id, "reject")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                  <button
                    onClick={() => handleAction(s.id, "accept")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {accepted.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.amount)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Aceito — aguardando pagamento
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {rejected.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-400 line-through">{s.name}</p>
                {s.description && <p className="text-xs text-gray-300">{s.description}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-gray-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.amount)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                  <XCircle className="h-3 w-3" />
                  Recusado
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_PT: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
};

function TeamSection({ projectId }: { projectId: string }) {
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

  if (isLoading || assignments.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Users className="h-5 w-5 text-[#EA580C]" />
        Equipe na Obra
      </h2>
      <div className="space-y-3">
        {assignments.map((a: any) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {new Date(a.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  {a.departureTime && ` · ${a.departureTime}`}
                </span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                a.status === "IN_PROGRESS"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {STATUS_PT[a.status] ?? a.status}
              </span>
            </div>

            {/* Employee */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#EA580C]/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-[#EA580C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.employee.name}</p>
                {a.employee.role && <p className="text-xs text-gray-500">{a.employee.role}</p>}
                <div className="flex flex-wrap gap-3 mt-1">
                  {a.employee.rg && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      RG: {a.employee.rg}
                    </span>
                  )}
                  {a.employee.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      📞 {a.employee.phone}
                    </span>
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
                    {[a.vehicle.model, a.vehicle.color, a.vehicle.plate].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            )}

            {a.notes && (
              <p className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 italic">{a.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortalObraPage() {
  const { projectId } = usePortal();
  const { data: project, isLoading } = usePortalProject(projectId ?? "");

  if (!projectId || isLoading) return <LoadingPage message="Carregando informações..." />;
  if (!project) return null;

  const address = [
    project.street && `${project.street}${project.number ? `, ${project.number}` : ""}`,
    project.complement,
    project.neighborhood,
    project.city && project.state ? `${project.city} - ${project.state}` : (project.city || project.state),
    project.zipCode && `CEP ${project.zipCode}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Informações da Obra</h1>
        <p className="text-sm text-gray-500 mt-0.5">Detalhes gerais do projeto</p>
      </div>

      {/* Header card */}
      <div className="bg-[#1F2937] rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#EA580C] rounded-xl flex items-center justify-center flex-shrink-0">
            <HardHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{project.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-[#374151] text-gray-300 px-2.5 py-1 rounded-full">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
              <span className="text-xs text-gray-400">{project.progress}% concluído</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-[#EA580C]" />
            Datas
          </h3>
          <InfoRow label="Data de início" value={project.startDate ? formatDate(project.startDate) : null} />
          <InfoRow label="Previsão de término" value={project.expectedEndDate ? formatDate(project.expectedEndDate) : null} />
          <InfoRow label="Data de conclusão" value={project.actualEndDate ? formatDate(project.actualEndDate) : null} />
          {!project.startDate && !project.expectedEndDate && (
            <p className="text-sm text-gray-400">Datas ainda não definidas.</p>
          )}
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-[#EA580C]" />
            Endereço da Obra
          </h3>
          {address ? (
            <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
          ) : (
            <p className="text-sm text-gray-400">Endereço não informado.</p>
          )}
        </div>

        {/* Descrição */}
        {project.description && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-[#EA580C]" />
              Descrição
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        {/* Observações */}
        {project.notes && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Observações</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Equipe na Obra */}
      <TeamSection projectId={projectId} />

      {/* Serviços Extras */}
      <ExtraServicesSection projectId={projectId} />
    </div>
  );
}
