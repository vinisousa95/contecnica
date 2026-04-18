"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { usePortalFinancial } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, TrendingUp } from "lucide-react";

const EXPENSE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};
const REVENUE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor, sub }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function PortalFinanceiroPage() {
  const { projectId } = usePortal();
  const { data: financial, isLoading } = usePortalFinancial(projectId ?? "");

  if (!projectId || isLoading) return <LoadingPage message="Carregando financeiro..." />;
  if (!financial) return null;

  const { summary, expenses, revenues } = financial;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Custos e pagamentos da obra</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Orçamento"
          value={summary.budget ? formatCurrency(summary.budget) : "—"}
          sub="Valor previsto"
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <SummaryCard
          label="Total gasto"
          value={formatCurrency(summary.totalExpenses)}
          sub="Despesas da obra"
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <SummaryCard
          label="Recebido"
          value={formatCurrency(summary.totalReceived)}
          sub="Pagamentos recebidos"
          icon={ArrowUpCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <SummaryCard
          label="A receber"
          value={formatCurrency(summary.totalPending)}
          sub="Pendente de recebimento"
          icon={ArrowDownCircle}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-amber-500" />
            Despesas da Obra
          </h2>
        </div>
        {expenses.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Nenhuma despesa registrada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                  <p className="text-xs text-gray-400">{e.category} · {formatDate(e.dueDate)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXPENSE_STATUS_COLOR[e.status]}`}>
                  {e.statusLabel}
                </span>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatCurrency(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenues */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
            Pagamentos Recebidos
          </h2>
        </div>
        {revenues.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Nenhum pagamento registrado</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {revenues.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.description}</p>
                  <p className="text-xs text-gray-400">
                    {r.receivedDate ? `Recebido em ${formatDate(r.receivedDate)}` : `Vence em ${formatDate(r.dueDate)}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REVENUE_STATUS_COLOR[r.status]}`}>
                  {r.statusLabel}
                </span>
                <p className="text-sm font-semibold text-green-600 flex-shrink-0">
                  {formatCurrency(r.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
