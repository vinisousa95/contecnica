"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, FileText, Eye, Printer, Trash2, Send, FileCheck, Pencil } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  SIGNED: "Assinado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-50 text-blue-700",
  SIGNED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-500",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "SENT", label: "Enviado" },
  { value: "SIGNED", label: "Assinado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export default function ContratosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (search) params.search = search;

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", status, search],
    queryFn: () => api.contracts.list(params) as Promise<any[]>,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.contracts.update(id, { status: "SENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato enviado ao cliente!", variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contracts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contratos"
        description="Gerencie os contratos de serviço"
        actions={
          <Link href="/contratos/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Buscar por título, número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : contracts.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum contrato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm text-gray-500">{c.number}</TableCell>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.title}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.client?.name}</TableCell>
                    <TableCell className="text-sm text-gray-400">{c.project?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(c.totalAmount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/contratos/${c.id}`}>
                          <Button variant="ghost" size="icon-sm" title="Ver detalhes">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/contratos/${c.id}/editar`}>
                          <Button variant="ghost" size="icon-sm" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <a href={`/contratos/${c.id}/imprimir`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon-sm" title="Imprimir / PDF">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {c.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Enviar ao cliente"
                            onClick={() => sendMutation.mutate(c.id)}
                          >
                            <Send className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                        )}
                        {c.status === "SIGNED" && (
                          <a href={c.signedFileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon-sm" title="Ver assinado">
                              <FileCheck className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-400 hover:text-red-600"
                          title="Excluir contrato"
                          onClick={() => setDeleteId(c.id)}
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
        title="Excluir contrato"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
