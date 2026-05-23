"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Users, Pencil, Trash2, ArrowLeft, Phone, Mail } from "lucide-react";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo" };
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default function CompradoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["partnership-buyers", search, page],
    queryFn: () =>
      api.partnershipBuyers.list({
        ...(search && { search }),
        page: String(page),
        limit: "20",
      }),
  });

  const buyers: any[] = Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
  const pagination = (raw as any)?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.partnershipBuyers.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership-buyers"] });
      toast({ title: "Comprador excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "error" });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compradores / Parceiros"
        description="Gerenciar compradores e parceiros das obras"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/obras-parcerias"><ArrowLeft className="h-4 w-4" />Voltar</Link>
            </Button>
            <Button asChild>
              <Link href="/obras-parcerias/compradores/novo">
                <Plus className="h-4 w-4" />
                Novo Comprador
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1">
        <Input
          placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : buyers.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Nenhum comprador encontrado"
              action={
                !search && (
                  <Button asChild size="sm">
                    <Link href="/obras-parcerias/compradores/novo">
                      <Plus className="h-4 w-4" />
                      Novo Comprador
                    </Link>
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {buyers.map((b: any) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{b.name}</p>
                    {b.cpfCnpj && <p className="text-xs text-gray-400 mt-0.5">{b.cpfCnpj}</p>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${STATUS_COLORS[b.status] ?? STATUS_COLORS.ACTIVE}`}>
                    {STATUS_LABELS[b.status] ?? "Ativo"}
                  </span>
                </div>

                <div className="space-y-1 mb-4">
                  {b.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{b.email}</span>
                    </div>
                  )}
                  {b.city && (
                    <p className="text-xs text-gray-400">{[b.city, b.state].filter(Boolean).join(" — ")}</p>
                  )}
                </div>

                {b._count?.projects != null && (
                  <p className="text-xs text-gray-400 mb-3">{b._count.projects} obra{b._count.projects !== 1 ? "s" : ""}</p>
                )}

                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" asChild title="Editar">
                    <Link href={`/obras-parcerias/compradores/${b.id}/editar`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteId(b.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{pagination.total} comprador{pagination.total !== 1 ? "es" : ""}</span>
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
        title="Excluir comprador"
        description="Esta ação removerá o comprador. Obras vinculadas não serão excluídas."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
