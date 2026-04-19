"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePortal } from "@/components/portal/portal-provider";
import { usePortalProject } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { MapPin, Calendar, FileText, HardHat, Wrench, CheckCircle2, XCircle } from "lucide-react";

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
    </div>
  );
}
