"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingPage } from "@/components/ui/loading";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const PIE_COLORS = ["#EA580C", "#6B7280", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"];

export default function FluxoDeCaixaPage() {
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  const { data, isLoading } = useQuery({
    queryKey: ["cashflow", appliedFrom, appliedTo],
    queryFn: () =>
      api.reports.cashflow({ from: appliedFrom, to: appliedTo }) as Promise<any>,
  });

  const apply = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  if (isLoading) return <LoadingPage />;

  const summary = data?.summary ?? { totalInflow: 0, totalOutflow: 0, balance: 0 };

  const chartData =
    data?.daily
      ?.filter((d: any) => d.inflow > 0 || d.outflow > 0)
      .map((d: any) => ({
        ...d,
        dateLabel: format(new Date(d.date + "T12:00:00"), "dd/MM"),
      })) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fluxo de Caixa"
        description="Entradas e saídas no período selecionado"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="De"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="Até"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-40"
        />
        <Button onClick={apply} className="self-end">
          Aplicar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Entradas"
          value={formatCurrency(summary.totalInflow)}
          icon={ArrowUpCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Total de Saídas"
          value={formatCurrency(summary.totalOutflow)}
          icon={ArrowDownCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Saldo do Período"
          value={formatCurrency(summary.balance)}
          icon={summary.balance >= 0 ? TrendingUp : TrendingDown}
          iconBg={summary.balance >= 0 ? "bg-green-50" : "bg-red-50"}
          iconColor={summary.balance >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      {/* Area Chart */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entradas e Saídas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    formatCurrency(Number(v)),
                    name === "inflow" ? "Entradas" : "Saídas",
                  ]}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Legend
                  formatter={(v) => (v === "inflow" ? "Entradas" : "Saídas")}
                />
                <Bar dataKey="inflow" fill="#10B981" radius={[4, 4, 0, 0]} name="inflow" />
                <Bar dataKey="outflow" fill="#EA580C" radius={[4, 4, 0, 0]} name="outflow" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma movimentação no período selecionado</p>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {(data?.expenseByCategory?.length > 0 || data?.revenueByCategory?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data?.expenseByCategory?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.expenseByCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {data.expenseByCategory.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend
                      iconType="circle"
                      formatter={(v) => <span className="text-xs">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {data?.revenueByCategory?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Receitas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.revenueByCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {data.revenueByCategory.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend
                      iconType="circle"
                      formatter={(v) => <span className="text-xs">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
