"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatPhone, formatDocument,
  SPECIALTY_LABELS, SPECIALTY_COLORS,
  PROVIDER_TYPE_LABELS,
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
import { Plus, Search, Wrench, Pencil, Trash2, Eye, PowerOff } from "lucide-react";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo" };
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

const SPECIALTY_OPTIONS = [
  { value: "", label: "Todas as especialidades" },
  { value: "ELECTRICAL", label: "Elétrica" },
  { value: "PLUMBING", label: "Hidráulica" },
  { value: "PAINTING", label: "Pintura" },
  { value: "MASONRY", label: "Alvenaria" },
  { value: "FINISHING", label: "Acabamento" },
  { value: "DRYWALL", label: "Drywall/Gesso" },
  { value: "CARPENTRY", label: "Marcenaria" },
  { value: "METALWORK", label: "Serralheria" },
  { value: "GLASSWORK", label: "Vidraçaria" },
  { value: "CLEANING", label: "Limpeza" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "ENGINEERING", label: "Engenharia" },
  { value: "ARCHITECTURE", label: "Arquitetura" },
  { value: "OTHER", label: "Outros" },
];

export default function PrestadoresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [inactivateId, setInactivateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["service-providers", search, status, specialty, type, page],
    queryFn: () =>
      api.serviceProviders.list({
        ...(search && { search }),
        ...(status && { status }),
        ...(specialty && { specialty }),
        ...(type && { type }),
        page: String(page),
        limit: "20",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.serviceProviders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
      toast({ title: "Prestador excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const inactivateMutation = useMutation({
    mutationFn: (id: string) => api.serviceProviders.inactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
      toast({ title: "Prestador inativado", variant: "success" });
      setInactivateId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao inativar", description: err.message, variant: "error" });
      setInactivateId(null);
    },
  });

  const providers = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prestadores de Serviços"
        description="Gerencie os parceiros e terceirizados das obras"
        actions={
          <Button asChild>
            <Link href="/prestadores/novo">
              <Plus className="h-4 w-4" />
              Novo Prestador
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, telefone, documento..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          className="sm:w-48"
          value={specialty}
          onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}
          options={SPECIALTY_OPTIONS}
        />
        <Select
          className="sm:w-40"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Tipo" },
            { value: "INDIVIDUAL", label: "Pessoa Física" },
            { value: "COMPANY", label: "Pessoa Jurídica" },
          ]}
        />
        <Select
          className="sm:w-36"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Status" },
            { value: "ACTIVE", label: "Ativo" },
            { value: "INACTIVE", label: "Inativo" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : providers.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-12 w-12" />}
              title="Nenhum prestador encontrado"
              action={
                !search && !status && !specialty && (
                  <Button asChild size="sm">
                    <Link href="/prestadores/novo">
                      <Plus className="h-4 w-4" />
                      Novo Prestador
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
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">
                      <Link href={`/prestadores/${p.id}`} className="hover:text-blue-600">
                        {p.name}
                      </Link>
                      {p.documentNumber && (
                        <p className="text-xs text-gray-400">{formatDocument(p.documentNumber)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SPECIALTY_COLORS[p.specialty]}`}>
                        {SPECIALTY_LABELS[p.specialty]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{PROVIDER_TYPE_LABELS[p.type]}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatPhone(p.phone)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild title="Ver detalhes">
                          <Link href={`/prestadores/${p.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild title="Editar">
                          <Link href={`/prestadores/${p.id}/editar`}><Pencil className="h-3.5 w-3.5" /></Link>
                        </Button>
                        {p.status === "ACTIVE" && (
                          <Button
                            variant="ghost" size="icon-sm"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => setInactivateId(p.id)}
                            title="Inativar"
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(p.id)}
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
          <span>{pagination.total} prestador{pagination.total !== 1 ? "es" : ""} encontrado{pagination.total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <span className="text-xs text-gray-600">Página {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!inactivateId}
        onOpenChange={(open) => !open && setInactivateId(null)}
        title="Inativar prestador"
        description="O prestador ficará inativo e não aparecerá como opção em novos vínculos. O histórico será mantido."
        confirmLabel="Inativar"
        loading={inactivateMutation.isPending}
        onConfirm={() => inactivateId && inactivateMutation.mutate(inactivateId)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir prestador"
        description="Esta ação não pode ser desfeita. Vínculos com obras existentes também serão removidos."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
