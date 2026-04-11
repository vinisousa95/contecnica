"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatDocument,
  formatPhone,
  CLIENT_STATUS_LABELS,
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
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Building2,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", search, status],
    queryFn: () =>
      api.clients.list({
        ...(search && { search }),
        ...(status && { status }),
      }) as Promise<any>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const clients = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes da empresa"
        actions={
          <Button asChild>
            <Link href="/clientes/novo">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, e-mail, CPF/CNPJ..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          placeholder="Todos os status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "", label: "Todos os status" },
            { value: "ACTIVE", label: "Ativos" },
            { value: "INACTIVE", label: "Inativos" },
          ]}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : clients.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Nenhum cliente encontrado"
              description={search ? "Tente mudar os termos da busca." : "Cadastre seu primeiro cliente."}
              action={
                !search && (
                  <Button asChild size="sm">
                    <Link href="/clientes/novo">
                      <Plus className="h-4 w-4" />
                      Novo Cliente
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
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Obras</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EA580C]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#EA580C] text-xs font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDocument(client.document)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {client.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(client.phone)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {client.city ? `${client.city}/${client.state}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 font-medium">
                      {client._count?.projects ?? 0}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          client.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {CLIENT_STATUS_LABELS[client.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/clientes/${client.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/clientes/${client.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(client.id)}
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
        title="Excluir cliente"
        description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
