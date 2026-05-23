"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, HardHat, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento", IN_PROGRESS: "Em Andamento", PAUSED: "Pausada",
  COMPLETED: "Concluída", CANCELLED: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700", COMPLETED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-500",
};

export default function ObrasPessoaisPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["personal-projects", search, status, page],
    queryFn: () =>
      api.personalProjects.list({
        ...(search && { search }),
        ...(status && { status }),
        page: String(page),
        limit: "20",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.personalProjects.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-projects"] });
      toast({ title: "Obra excluída", variant: "success" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const projects: any[] = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Obras Pessoais"
        description="Gerenciar obras e projetos pessoais"
        actions={
          <Button asChild>
            <Link href="/obras-pessoais/nova">
              <Plus className="h-4 w-4" />
              Nova Obra
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          className="sm:w-48"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Todos os status" },
            { value: "PLANNING", label: "Planejamento" },
            { value: "IN_PROGRESS", label: "Em Andamento" },
            { value: "PAUSED", label: "Pausada" },
            { value: "COMPLETED", label: "Concluída" },
            { value: "CANCELLED", label: "Cancelada" },
          ]}
        />
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<HardHat className="h-12 w-12" />}
              title="Nenhuma obra pessoal encontrada"
              action={
                !search && !status && (
                  <Button asChild size="sm">
                    <Link href="/obras-pessoais/nova">
                      <Plus className="h-4 w-4" />
                      Nova Obra
                    </Link>
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <Link href={`/obras-pessoais/${p.id}`} className="font-semibold text-gray-900 hover:text-[#EA580C] text-sm leading-tight block truncate">
                      {p.name}
                    </Link>
                    {p.address && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.address}</p>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                {p.budgetedAmount != null && (
                  <div className="mb-3 p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Valor previsto</p>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(p.budgetedAmount)}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  {p.startDate && <span>Início: {formatDate(p.startDate)}</span>}
                  {p.expectedEndDate && <span>Previsão: {formatDate(p.expectedEndDate)}</span>}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <span>{p._count?.materials ?? 0} materiais</span>
                  <span>·</span>
                  <span>{p._count?.projectProviders ?? 0} prestadores</span>
                  <span>·</span>
                  <span>{p._count?.projectExpenses ?? 0} despesas</span>
                </div>

                <div className="flex items-center justify-between">
                  <Link href={`/obras-pessoais/${p.id}`} className="text-xs text-[#EA580C] hover:underline">
                    Ver detalhes →
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" asChild title="Editar">
                      <Link href={`/obras-pessoais/${p.id}/editar`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(p.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{pagination.total} obra{pagination.total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-xs">Página {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir obra pessoal"
        description="Esta ação removerá todos os materiais, despesas e prestadores vinculados."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
