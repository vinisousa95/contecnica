"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingPage } from "@/components/ui/loading";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, HardHat, DollarSign } from "lucide-react";

export default function RelatoriosPage() {
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-projects", status],
    queryFn: () =>
      api.reports.projects({
        ...(status && { status }),
      }) as Promise<any>,
  });

  const projects = Array.isArray(data) ? data : [];

  // Aggregates
  const totalRevenues = projects.reduce((s: number, p: any) => s + p.totalRevenues, 0);
  const totalExpenses = projects.reduce((s: number, p: any) => s + p.totalExpenses, 0);
  const totalMargin = projects.reduce((s: number, p: any) => s + p.margin, 0);
  const avgMarginPercent = projects.length
    ? Math.round(projects.reduce((s: number, p: any) => s + (p.marginPercent ?? 0), 0) / projects.length)
    : 0;

  const chartData = projects.slice(0, 10).map((p: any) => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
    receitas: p.totalRevenues,
    custos: p.totalExpenses,
    margem: p.margin,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description="Análise financeira e gerencial das obras"
      />

      <div className="flex gap-3 items-end">
        <Select
          label="Filtrar por status"
          className="w-52"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "", label: "Todas as obras" },
            { value: "PLANNING", label: "Planejamento" },
            { value: "IN_PROGRESS", label: "Em Andamento" },
            { value: "COMPLETED", label: "Concluídas" },
            { value: "PAUSED", label: "Pausadas" },
            { value: "CANCELLED", label: "Canceladas" },
          ]}
        />
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total de Obras"
              value={String(projects.length)}
              icon={HardHat}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Total Receitas"
              value={formatCurrency(totalRevenues)}
              icon={TrendingUp}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <StatCard
              title="Total Custos"
              value={formatCurrency(totalExpenses)}
              icon={TrendingDown}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Margem Total"
              value={formatCurrency(totalMargin)}
              subtitle={`Média: ${avgMarginPercent}%`}
              icon={DollarSign}
              iconBg={totalMargin >= 0 ? "bg-green-50" : "bg-red-50"}
              iconColor={totalMargin >= 0 ? "text-green-600" : "text-red-600"}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Receitas vs Custos por Obra</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="custos" fill="#F59E0B" name="Custos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhamento por Obra</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhuma obra encontrada com os filtros aplicados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obra</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Orçamento</TableHead>
                        <TableHead className="text-right">Receitas</TableHead>
                        <TableHead className="text-right">Custos</TableHead>
                        <TableHead className="text-right">Margem</TableHead>
                        <TableHead className="text-right">Margem %</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Término</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-sm max-w-[180px] truncate">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{p.clientName}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[p.status]}`}>
                              {PROJECT_STATUS_LABELS[p.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {p.budget ? formatCurrency(p.budget) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-700 font-medium">
                            {formatCurrency(p.totalRevenues)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-amber-700 font-medium">
                            {formatCurrency(p.totalExpenses)}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${p.margin >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {formatCurrency(p.margin)}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-medium ${
                            p.marginPercent >= 20 ? "text-green-700" : p.marginPercent >= 0 ? "text-amber-700" : "text-red-700"
                          }`}>
                            {p.marginPercent ?? 0}%
                          </TableCell>
                          <TableCell className="text-sm text-gray-400">
                            {formatDate(p.startDate)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-400">
                            {formatDate(p.actualEndDate ?? p.expectedEndDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
