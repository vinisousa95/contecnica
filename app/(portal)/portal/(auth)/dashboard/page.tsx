"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { usePortalProject } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  HardHat, TrendingUp, DollarSign, Calendar, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, BarChart3,
} from "lucide-react";
import Link from "next/link";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Orçamento"
              value={project.budget ? formatCurrency(project.budget) : "—"}
              sub="Valor previsto"
              icon={BarChart3}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Gasto até agora"
              value={formatCurrency(project.totalExpenses)}
              sub="Total de despesas"
              icon={TrendingUp}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Recebido"
              value={formatCurrency(project.totalReceived)}
              sub="Pagamentos recebidos"
              icon={DollarSign}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <StatCard
              label="Saldo restante"
              value={project.remaining !== null ? formatCurrency(project.remaining) : "—"}
              sub={project.remaining !== null && project.remaining < 0 ? "Acima do orçamento" : "Dentro do orçamento"}
              icon={project.remaining !== null && project.remaining < 0 ? AlertTriangle : CheckCircle2}
              iconBg={project.remaining !== null && project.remaining < 0 ? "bg-red-50" : "bg-green-50"}
              iconColor={project.remaining !== null && project.remaining < 0 ? "text-red-600" : "text-green-600"}
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
