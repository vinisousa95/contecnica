"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import {
  HardHat,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

/** "2026-08" → "agosto de 2026" */
function monthLabel(ym?: string): string {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

/** Só a primeira letra. O CSS `capitalize` maiuscularia o "de" também. */
function ucFirst(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

const CHART_COLORS = ["#EA580C", "#6B7280", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"];

function AlertItem({
  icon: Icon,
  iconClass,
  title,
  amount,
  date,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  amount: number;
  date: Date;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        <p className="text-xs text-gray-400 mt-0.5">Vence {formatDate(date)}</p>
      </div>
      <p className="text-sm font-semibold text-gray-700 flex-shrink-0">{formatCurrency(amount)}</p>
    </div>
  );
}

export default function DashboardPage() {
  // Vazio = mês corrente (a API decide), para o primeiro carregamento não
  // depender do relógio do navegador.
  const [month, setMonth] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", month],
    queryFn: () => api.dashboard.summary(month || undefined) as Promise<any>,
    refetchInterval: 60_000,
    // Mantém os números anteriores na tela ao trocar de mês, em vez de piscar
    // a tela de carregamento inteira.
    placeholderData: (prev: any) => prev,
  });

  if (isLoading && !data) return <LoadingPage message="Carregando dashboard..." />;
  if (!data) return null;

  const {
    projects, financial, alerts, recentMovements, activeProjects, budgets, recentBudgets,
    availableMonths = [], selectedMonth,
  } = data as any;

  const cashflowData = [
    {
      name: "Receitas",
      value: financial.monthIncome,
    },
    {
      name: "Despesas",
      value: financial.monthOutflow,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Visão geral — ${monthLabel(selectedMonth)}`}
        actions={
          <select
            value={selectedMonth}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Mês do dashboard"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
          >
            {availableMonths.map((m: string) => (
              <option key={m} value={m}>
                {ucFirst(monthLabel(m))}
              </option>
            ))}
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Obras em andamento"
          value={String(projects.inProgress)}
          subtitle={`${projects.planning} em planejamento`}
          icon={HardHat}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Receitas do mês"
          value={formatCurrency(financial.monthIncome)}
          subtitle="Recebido em caixa"
          icon={ArrowUpCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Despesas do mês"
          value={formatCurrency(financial.monthOutflow)}
          subtitle="Pago em caixa"
          icon={ArrowDownCircle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Saldo do mês"
          value={formatCurrency(financial.monthBalance)}
          subtitle={financial.monthBalance >= 0 ? "Resultado positivo" : "Resultado negativo"}
          icon={financial.monthBalance >= 0 ? TrendingUp : TrendingDown}
          iconBg={financial.monthBalance >= 0 ? "bg-green-50" : "bg-red-50"}
          iconColor={financial.monthBalance >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="A pagar (pendente)"
          value={formatCurrency(financial.payable.total)}
          subtitle={`${financial.payable.count} conta(s)`}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="A receber (pendente)"
          value={formatCurrency(financial.receivable.total)}
          subtitle={`${financial.receivable.count} conta(s)`}
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Despesas vencidas"
          value={formatCurrency(financial.overdueExpenses.total)}
          subtitle={`${financial.overdueExpenses.count} conta(s)`}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Obras concluídas"
          value={String(projects.completed)}
          subtitle={`${projects.total} obras no total`}
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow pie */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={cashflowData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {cashflowData.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? "#10B981" : "#EA580C"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Saldo</span>
                <span
                  className={`font-semibold ${
                    financial.monthBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(financial.monthBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Alertas — Próximos 7 dias</CardTitle>
              {(alerts.upcomingExpenses.length + alerts.upcomingRevenues.length === 0) && (
                <span className="text-xs text-green-600 font-medium">Tudo em dia</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alerts.upcomingExpenses.length === 0 && alerts.upcomingRevenues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhum vencimento próximo</p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {alerts.upcomingExpenses.slice(0, 5).map((item: any) => (
                  <AlertItem
                    key={item.id}
                    icon={ArrowDownCircle}
                    iconClass="bg-amber-50 text-amber-600"
                    title={item.description}
                    subtitle={item.projectName}
                    amount={item.amount}
                    date={item.dueDate}
                  />
                ))}
                {alerts.upcomingRevenues.slice(0, 5).map((item: any) => (
                  <AlertItem
                    key={item.id}
                    icon={ArrowUpCircle}
                    iconClass="bg-green-50 text-green-600"
                    title={item.description}
                    subtitle={item.clientName}
                    amount={item.amount}
                    date={item.dueDate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Obras em Andamento</CardTitle>
              <Link
                href="/obras"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todas →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Obra</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Orçamento</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Custo Real</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Margem</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeProjects.map((project: any) => (
                    <tr key={project.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/obras/${project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{project.clientName}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-700">
                        {project.budget ? formatCurrency(project.budget) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-700">
                        {formatCurrency(project.totalExpenses)}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${
                        project.realizedMargin >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {formatCurrency(project.realizedMargin)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Summary */}
      {budgets && budgets.total > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Orçamentos Recentes</CardTitle>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  {budgets.sent} enviado(s) · {formatCurrency(budgets.sentTotal)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {budgets.approved} aprovado(s) · {formatCurrency(budgets.approvedTotal)}
                </span>
                <Link href="/orcamentos" className="text-blue-600 hover:text-blue-700 font-medium">
                  Ver todos →
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {recentBudgets.map((b: any) => (
                <Link
                  key={b.id}
                  href={`/orcamentos/${b.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {b.clientName} · <span className="font-mono">{b.code}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
                  </div>
                  <Badge
                    variant={
                      b.status === "APPROVED" ? "success" :
                      b.status === "SENT" ? "info" :
                      b.status === "UNDER_REVIEW" ? "warning" :
                      b.status === "REJECTED" ? "danger" : "default"
                    }
                  >
                    {b.status === "DRAFT" ? "Rascunho" :
                     b.status === "UNDER_REVIEW" ? "Em Revisão" :
                     b.status === "SENT" ? "Enviado" :
                     b.status === "APPROVED" ? "Aprovado" :
                     b.status === "REJECTED" ? "Recusado" : "Cancelado"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Últimas Movimentações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentMovements.expenses.length === 0 && recentMovements.revenues.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[
                ...recentMovements.expenses.map((e: any) => ({ ...e, type: "expense" })),
                ...recentMovements.revenues.map((r: any) => ({ ...r, type: "revenue" })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map((item: any) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/80">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.type === "expense" ? "bg-red-50" : "bg-green-50"
                      }`}
                    >
                      {item.type === "expense" ? (
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.projectName ?? item.clientName ?? "Geral"} · {formatDate(item.date)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold flex-shrink-0 ${
                        item.type === "expense" ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {item.type === "expense" ? "-" : "+"}
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
