"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  PERSONAL_EXPENSE_CATEGORY_LABELS,
  PERSONAL_EXPENSE_CATEGORY_COLORS,
  PERSONAL_EXPENSE_STATUS_LABELS,
  PERSONAL_EXPENSE_STATUS_COLORS,
  PERSONAL_PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Search, Wallet, Pencil, Trash2, CheckCircle,
  TrendingDown, Clock, AlertTriangle,
} from "lucide-react";

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

const MONTH_OPTIONS = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" }, { value: "4", label: "Abril" },
  { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

const CATEGORY_OPTIONS = Object.entries(PERSONAL_EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export default function GastosPessoaisPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = {
    ...(search && { search }),
    ...(category && { category }),
    ...(status && { status }),
    ...(month && { month }),
    ...(year && { year }),
    page: String(page),
    limit: "20",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["personal-expenses", params],
    queryFn: () => api.personalExpenses.list(params),
  });

  const summaryMonth = month || String(CURRENT_MONTH);
  const summaryYear = year || String(CURRENT_YEAR);
  const { data: summary } = useQuery({
    queryKey: ["personal-expenses-summary", summaryMonth, summaryYear],
    queryFn: () => api.personalExpenses.summary({ month: summaryMonth, year: summaryYear }) as Promise<any>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.personalExpenses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["personal-expenses-summary"] });
      toast({ title: "Gasto excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.personalExpenses.pay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["personal-expenses-summary"] });
      toast({ title: "Pagamento registrado", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao registrar pagamento", description: err.message, variant: "error" });
    },
  });

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gastos Pessoais"
        description="Controle seus gastos pessoais separados das finanças da empresa"
        actions={
          <Button asChild>
            <Link href="/gastos-pessoais/novo">
              <Plus className="h-4 w-4" />
              Novo Gasto
            </Link>
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total do Mês</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary?.totalMonth ?? 0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{summary?.countMonth ?? 0} gastos</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pago</p>
                  <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(summary?.totalPaid ?? 0)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendente</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(summary?.totalPending ?? 0)}</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vencidos</p>
                  <p className="text-xl font-bold text-red-700 mt-1">{summary?.overdueCount ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">no total</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por descrição..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            options={[{ value: "", label: "Todas as categorias" }, ...CATEGORY_OPTIONS]}
          />
        </div>
        <div className="w-36">
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Todos os status" },
              { value: "PENDING", label: "Pendente" },
              { value: "PAID", label: "Pago" },
              { value: "OVERDUE", label: "Vencido" },
              { value: "CANCELED", label: "Cancelado" },
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
            options={[{ value: "", label: "Todos os meses" }, ...MONTH_OPTIONS]}
          />
        </div>
        <div className="w-24">
          <Select
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Ano" },
              { value: String(CURRENT_YEAR), label: String(CURRENT_YEAR) },
              { value: String(CURRENT_YEAR - 1), label: String(CURRENT_YEAR - 1) },
              { value: String(CURRENT_YEAR - 2), label: String(CURRENT_YEAR - 2) },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="Nenhum gasto encontrado"
              action={
                !search && !category && !status && (
                  <Button asChild size="sm">
                    <Link href="/gastos-pessoais/novo">
                      <Plus className="h-4 w-4" />
                      Novo Gasto
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">
                      <Link href={`/gastos-pessoais/${item.id}`} className="hover:text-orange-600">
                        {item.description}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PERSONAL_EXPENSE_CATEGORY_COLORS[item.category]}`}>
                        {PERSONAL_EXPENSE_CATEGORY_LABELS[item.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {item.expenseDate ? new Date(item.expenseDate).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {PERSONAL_PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PERSONAL_EXPENSE_STATUS_COLORS[item.status]}`}>
                        {PERSONAL_EXPENSE_STATUS_LABELS[item.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {item.status !== "PAID" && item.status !== "CANCELED" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Marcar como pago"
                            onClick={() => payMutation.mutate(item.id)}
                            disabled={payMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" asChild title="Editar">
                          <Link href={`/gastos-pessoais/${item.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(item.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {pagination.total} gasto{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir gasto pessoal"
        description="Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
