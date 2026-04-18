"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
  REVENUE_STATUS_LABELS,
  REVENUE_STATUS_COLORS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Calendar,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Plus,
} from "lucide-react";

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => api.projects.get(params.id) as Promise<any>,
  });

  if (isLoading) return <LoadingPage />;
  if (!project) return null;

  const { financialSummary: fs } = project;

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={project.name}
        description={`Cliente: ${project.client?.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/obras">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/obras/${params.id}/portal`}>
                Portal do Cliente
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/obras/${params.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status + info */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
        {project.startDate && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Início: {formatDate(project.startDate)}
          </span>
        )}
        {project.expectedEndDate && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Previsão: {formatDate(project.expectedEndDate)}
          </span>
        )}
        {project.city && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {project.city}/{project.state}
          </span>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinCard
          label="Orçamento"
          value={fs.budget ? formatCurrency(fs.budget) : "—"}
          sub={fs.budget && fs.budgetUsed ? `${fs.budgetUsed.toFixed(0)}% usado` : undefined}
          color="blue"
        />
        <FinCard
          label="Custo total"
          value={formatCurrency(fs.totalExpenses)}
          sub={`${formatCurrency(fs.paidExpenses)} pago`}
          color="amber"
        />
        <FinCard
          label="Receita total"
          value={formatCurrency(fs.totalRevenues)}
          sub={`${formatCurrency(fs.receivedRevenues)} recebido`}
          color="green"
        />
        <FinCard
          label="Margem"
          value={formatCurrency(fs.margin)}
          positive={fs.margin >= 0}
          color={fs.margin >= 0 ? "green" : "red"}
        />
      </div>

      {/* Budget bar */}
      {fs.budget && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Uso do Orçamento</span>
              <span className={`font-semibold ${
                (fs.budgetUsed ?? 0) > 100 ? "text-red-600" : (fs.budgetUsed ?? 0) > 80 ? "text-amber-600" : "text-gray-700"
              }`}>
                {formatCurrency(fs.totalExpenses)} / {formatCurrency(fs.budget)}
                {" "}({fs.budgetUsed?.toFixed(0) ?? 0}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (fs.budgetUsed ?? 0) > 100 ? "bg-red-500" : (fs.budgetUsed ?? 0) > 80 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, fs.budgetUsed ?? 0)}%` }}
              />
            </div>
            {fs.budgetVariance !== null && (
              <p className={`text-xs mt-1 ${fs.budgetVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fs.budgetVariance >= 0
                  ? `${formatCurrency(fs.budgetVariance)} abaixo do orçamento`
                  : `${formatCurrency(Math.abs(fs.budgetVariance))} acima do orçamento`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expenses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              Despesas ({project.expenses?.length ?? 0})
            </CardTitle>
            <Button size="sm" asChild>
              <Link href={`/financeiro/despesas/nova?obraId=${params.id}`}>
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {project.expenses?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma despesa lançada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.expenses?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.description}</TableCell>
                    <TableCell className="text-sm text-gray-500">{e.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(e.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_STATUS_COLORS[e.status]}`}>
                        {EXPENSE_STATUS_LABELS[e.status]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revenues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              Receitas ({project.revenues?.length ?? 0})
            </CardTitle>
            <Button size="sm" asChild>
              <Link href={`/financeiro/receitas/nova?obraId=${params.id}`}>
                <Plus className="h-4 w-4" />
                Nova Receita
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {project.revenues?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma receita lançada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.revenues?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.description}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(r.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold text-sm text-green-700">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REVENUE_STATUS_COLORS[r.status]}`}>
                        {REVENUE_STATUS_LABELS[r.status]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {project.description && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Descrição</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinCard({
  label,
  value,
  sub,
  color,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "amber" | "green" | "red";
  positive?: boolean;
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    green: "bg-green-50 border-green-100",
    red: "bg-red-50 border-red-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${
        positive === false ? "text-red-700" : positive === true ? "text-green-700" : "text-gray-800"
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
