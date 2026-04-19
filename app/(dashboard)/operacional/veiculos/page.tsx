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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Truck, Pencil, Trash2, History } from "lucide-react";

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Manutenção",
  INACTIVE: "Inativo",
};

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default function VeiculosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", search, status, page],
    queryFn: () =>
      api.vehicles.list({
        ...(search && { search }),
        ...(status && { status }),
        page: String(page),
        limit: "20",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Veículo excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const vehicles = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Veículos"
        description="Gerencie a frota de veículos operacionais"
        actions={
          <Button asChild>
            <Link href="/operacional/veiculos/novo">
              <Plus className="h-4 w-4" />
              Novo Veículo
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, modelo, placa, tipo..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          className="sm:w-44"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Todos os status" },
            { value: "ACTIVE", label: "Ativo" },
            { value: "MAINTENANCE", label: "Manutenção" },
            { value: "INACTIVE", label: "Inativo" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : vehicles.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-12 w-12" />}
              title="Nenhum veículo encontrado"
              action={
                !search && !status && (
                  <Button asChild size="sm">
                    <Link href="/operacional/veiculos/novo">
                      <Plus className="h-4 w-4" />
                      Novo Veículo
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-sm">
                      <Link href={`/operacional/veiculos/${v.id}`} className="hover:text-blue-600">
                        {v.name}
                      </Link>
                      {v.color && (
                        <p className="text-xs text-gray-400">{v.color}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{v.model ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500 font-mono">
                      {v.plate ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{v.type ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{v.year ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VEHICLE_STATUS_COLORS[v.status]}`}>
                        {VEHICLE_STATUS_LABELS[v.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild title="Histórico">
                          <Link href={`/operacional/veiculos/${v.id}`}>
                            <History className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild title="Editar">
                          <Link href={`/operacional/veiculos/${v.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(v.id)}
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
            {pagination.total} veículo{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir veículo"
        description="Tem certeza que deseja excluir este veículo? Registros de deslocamento vinculados serão afetados."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
