"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  REVENUE_STATUS_LABELS,
  REVENUE_STATUS_COLORS,
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
import { Plus, Search, ArrowUpCircle, Pencil, Trash2 } from "lucide-react";

export default function ReceitasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["revenues", search, status],
    queryFn: () =>
      api.revenues.list({
        ...(search && { search }),
        ...(status && { status }),
      }) as Promise<any>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.revenues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Receita excluída", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const revenues = Array.isArray(data) ? data : [];
  const totalShown = revenues.reduce((sum: number, r: any) => sum + r.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contas a Receber"
        description="Gerencie todos os recebimentos"
        actions={
          <Button asChild>
            <Link href="/financeiro/receitas/nova">
              <Plus className="h-4 w-4" />
              Nova Receita
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por descrição..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "", label: "Todos os status" },
            { value: "PENDING", label: "Pendente" },
            { value: "RECEIVED", label: "Recebido" },
            { value: "OVERDUE", label: "Vencido" },
          ]}
        />
      </div>

      {revenues.length > 0 && (
        <div className="text-sm text-gray-500">
          Total exibido:{" "}
          <span className="font-semibold text-green-700">{formatCurrency(totalShown)}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : revenues.length === 0 ? (
            <EmptyState
              icon={<ArrowUpCircle className="h-12 w-12" />}
              title="Nenhuma receita encontrada"
              action={
                !search && (
                  <Button asChild size="sm">
                    <Link href="/financeiro/receitas/nova">
                      <Plus className="h-4 w-4" />
                      Nova Receita
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.description}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.client?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {r.project ? (
                        <Link href={`/obras/${r.project.id}`} className="hover:text-blue-600">
                          {r.project.name}
                        </Link>
                      ) : "Geral"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(r.dueDate)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {r.receivedDate ? formatDate(r.receivedDate) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-green-700">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REVENUE_STATUS_COLORS[r.status]}`}>
                        {REVENUE_STATUS_LABELS[r.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/financeiro/receitas/${r.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(r.id)}
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir receita"
        description="Tem certeza que deseja excluir esta receita?"
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
