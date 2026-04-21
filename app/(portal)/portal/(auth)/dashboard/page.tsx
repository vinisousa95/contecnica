"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { usePortalProject } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  HardHat, TrendingUp, Calendar, ChevronRight,
  Clock, BarChart3, DollarSign, Wrench, AlertCircle, ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const { projectId, projects, isLoading: projectsLoading, setProjectId } = usePortal();
  const { data: project, isLoading } = usePortalProject(projectId ?? "");

  const { data: extraServices = [] } = useQuery({
    queryKey: ["portal-extra-services", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/v1/projects/${projectId}/extra-services`);
      const json = await res.json();
      return (json.data ?? []) as any[];
    },
    enabled: !!projectId,
  });
  const pendingServices = extraServices.filter((s: any) => s.status === "PENDING_APPROVAL");

  if (projectsLoading) return <LoadingPage message="Carregando..." />;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HardHat className="h-12 w-12 text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">Nenhuma obra encontrada</h2>
        <p className="text-sm text-gray-400 mt-1">Entre em contato com a Contécnica.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Minha Obra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Acompanhe o andamento em tempo real</p>
        </div>
        {projects.length > 1 && (
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
          >
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Pending extra services alert */}
      {pendingServices.length > 0 && (
        <Link
          href="/portal/servicos-extras"
          className="flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-5 py-4 hover:bg-amber-100 transition-colors"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {pendingServices.length} serviço{pendingServices.length > 1 ? "s" : ""} extra{pendingServices.length > 1 ? "s" : ""} aguardando sua aprovação
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Clique para ver e responder</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-600 flex-shrink-0" />
        </Link>
      )}

      {isLoading && <LoadingPage message="Carregando obra..." />}
      {!isLoading && project && (
        <>
          {/* Title card */}
          <div className="bg-[#1F2937] rounded-xl p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-3 ${STATUS_COLORS[project.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {project.statusLabel}
                </span>
                <h2 className="text-xl font-bold truncate">{project.name}</h2>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-300">
                  {project.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Início: {formatDate(project.startDate)}
                    </span>
                  )}
                  {project.expectedEndDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Previsão: {formatDate(project.expectedEndDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-bold text-[#EA580C]">{project.progress}%</p>
                <p className="text-xs text-gray-400">concluído</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="bg-[#374151] rounded-full h-2">
                <div
                  className="bg-[#EA580C] rounded-full h-2 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Orçamento"
              value={project.budget ? formatCurrency(project.budget) : "—"}
              sub="Valor previsto"
              icon={BarChart3}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Total Gasto"
              value={formatCurrency(project.totalExpenses ?? 0)}
              sub="Material + serviços extras"
              icon={TrendingUp}
              iconBg="bg-red-50"
              iconColor="text-red-500"
            />
            <StatCard
              label="Reembolso de Material"
              value={formatCurrency(project.totalMaterial ?? 0)}
              sub="Materiais da obra"
              icon={ShoppingCart}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Serviços Extras"
              value={formatCurrency(project.totalExtraServices ?? 0)}
              sub="Serviços aprovados"
              icon={Wrench}
              iconBg="bg-orange-50"
              iconColor="text-[#EA580C]"
            />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Ver andamento", desc: "Linha do tempo e etapas", href: "/portal/andamento", icon: Clock, count: project.counts?.updates },
              { label: "Ver fotos", desc: "Galeria de progresso", href: "/portal/fotos", icon: HardHat, count: project.counts?.photos },
              { label: "Documentos", desc: "Contratos e relatórios", href: "/portal/documentos", icon: DollarSign, count: project.counts?.documents },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:border-[#EA580C] hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-[#EA580C]" />
                  </div>
                  {item.count !== undefined && (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-[#EA580C] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Acessar</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
