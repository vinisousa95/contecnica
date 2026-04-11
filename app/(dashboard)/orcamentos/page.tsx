"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  UNDER_REVIEW: "Em Revisão",
  SENT: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  UNDER_REVIEW: "warning",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
};

const TIER_LABELS: Record<string, string> = {
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
};

export default function OrcamentosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["budgets", search, status, tier, page],
    queryFn: () =>
      api.budgets.list({
        ...(search && { search }),
        ...(status && { status }),
        ...(tier && { tier }),
        page: String(page),
      }) as Promise<any>,
  });

  const budgets = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.budgets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.budgets.duplicate(id),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento duplicado!", variant: "success" });
      router.push(`/orcamentos/${result?.id ?? ""}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orçamentos"
        description="Gerencie seus orçamentos de reforma"
        actions={
          <Button asChild size="sm">
            <Link href="/orcamentos/novo">
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por título, código ou cliente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select
              className="w-40"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Select
              className="w-36"
              value={tier}
              onChange={(e) => { setTier(e.target.value); setPage(1); }}
            >
              <option value="">Todos os padrões</option>
              <option value="LOW">Padrão Baixo</option>
              <option value="MEDIUM">Padrão Médio</option>
              <option value="HIGH">Padrão Alto</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {budgets.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum orçamento encontrado"
              description="Crie um novo orçamento para começar."
              action={
                <Button asChild size="sm">
                  <Link href="/orcamentos/novo">
                    <Plus className="h-4 w-4" />
                    Novo Orçamento
                  </Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{b.code}</TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900 line-clamp-1">{b.title}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{b.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-gray-600">{TIER_LABELS[b.tier]}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatCurrency(b.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[b.status]}>
                        {STATUS_LABELS[b.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(b.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/orcamentos/${b.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {b.status !== "APPROVED" && (
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link href={`/orcamentos/${b.id}/editar`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          loading={duplicateMutation.isPending}
                          onClick={() => duplicateMutation.mutate(b.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {b.status !== "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-400 hover:text-red-600"
                            onClick={() => setDeleteId(b.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {pagination.total} orçamento(s) · Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir orçamento?"
        description="Esta ação não pode ser desfeita. O orçamento será excluído permanentemente."
        confirmLabel="Excluir"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
