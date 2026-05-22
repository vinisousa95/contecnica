"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatPhone } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Users, Pencil, Trash2, History, FileText } from "lucide-react";

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default function FuncionariosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, status, page],
    queryFn: () =>
      api.employees.list({
        ...(search && { search }),
        ...(status && { status }),
        page: String(page),
        limit: "20",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.employees.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Funcionário excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const employees = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Funcionários"
        description="Gerencie a equipe operacional"
        actions={
          <Button asChild>
            <Link href="/operacional/funcionarios/novo">
              <Plus className="h-4 w-4" />
              Novo Funcionário
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, cargo, telefone..."
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
            { value: "INACTIVE", label: "Inativo" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Nenhum funcionário encontrado"
              action={
                !search && !status && (
                  <Button asChild size="sm">
                    <Link href="/operacional/funcionarios/novo">
                      <Plus className="h-4 w-4" />
                      Novo Funcionário
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
                  <TableHead>Cargo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium text-sm">
                      <Link href={`/operacional/funcionarios/${emp.id}`} className="hover:text-blue-600">
                        {emp.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{emp.role ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatPhone(emp.phone)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EMPLOYEE_STATUS_COLORS[emp.status]}`}>
                        {EMPLOYEE_STATUS_LABELS[emp.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild title="Histórico">
                          <Link href={`/operacional/funcionarios/${emp.id}`}>
                            <History className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Contrato de Trabalho" asChild>
                          <a href={`/funcionarios/${emp.id}/contrato`} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5 text-[#EA580C]" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild title="Editar">
                          <Link href={`/operacional/funcionarios/${emp.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(emp.id)}
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
            {pagination.total} funcionário{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
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
        title="Excluir funcionário"
        description="Tem certeza que deseja excluir este funcionário? Registros de deslocamento vinculados serão afetados."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
