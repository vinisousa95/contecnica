"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, MapPin, Pencil, Trash2 } from "lucide-react";

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OperacionalPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", search, status, projectId, employeeId, vehicleId, from, to, page],
    queryFn: () =>
      api.assignments.list({
        ...(search && { search }),
        ...(status && { status }),
        ...(projectId && { projectId }),
        ...(employeeId && { employeeId }),
        ...(vehicleId && { vehicleId }),
        ...(from && { from }),
        ...(to && { to }),
        page: String(page),
        limit: "20",
      }),
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects-select"],
    queryFn: () => api.projects.list({ limit: "100" }) as Promise<any>,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-select"],
    queryFn: () => api.employees.list({ limit: "100", status: "ACTIVE" }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-select"],
    queryFn: () => api.vehicles.list({ limit: "100", status: "ACTIVE" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.assignments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast({ title: "Registro excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const assignments = data?.data ?? [];
  const pagination = data?.pagination;

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const employees = employeesData?.data ?? [];
  const vehicles = vehiclesData?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operacional"
        description="Gerencie os deslocamentos e alocação de equipe"
        actions={
          <Button asChild>
            <Link href="/operacional/novo">
              <Plus className="h-4 w-4" />
              Novo Registro
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por funcionário, obra, veículo..."
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
              { value: "SCHEDULED", label: "Agendado" },
              { value: "IN_PROGRESS", label: "Em Andamento" },
              { value: "COMPLETED", label: "Finalizado" },
              { value: "CANCELLED", label: "Cancelado" },
            ]}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            className="sm:w-52"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Todas as obras" },
              ...projects.map((p: any) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            className="sm:w-44"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Todos os funcionários" },
              ...employees.map((e: any) => ({ value: e.id, label: e.name })),
            ]}
          />
          <Select
            className="sm:w-44"
            value={vehicleId}
            onChange={(e) => { setVehicleId(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Todos os veículos" },
              ...vehicles.map((v: any) => ({ value: v.id, label: v.name })),
            ]}
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-40"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
            <span className="text-gray-400 text-sm">até</span>
            <Input
              type="date"
              className="w-40"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="Nenhum registro encontrado"
              action={
                !search && !status && (
                  <Button asChild size="sm">
                    <Link href="/operacional/novo">
                      <Plus className="h-4 w-4" />
                      Novo Registro
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-sm">
                      <Link href={`/operacional/funcionarios/${a.employee?.id}`} className="hover:text-blue-600 font-medium">
                        {a.employee?.name ?? "—"}
                      </Link>
                      {a.employee?.role && (
                        <p className="text-xs text-gray-400">{a.employee.role}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <Link href={`/obras/${a.project?.id}`} className="hover:text-blue-600">
                        {a.project?.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {a.vehicle ? (
                        <span>
                          {a.vehicle.name}
                          {a.vehicle.plate && <span className="text-xs text-gray-400 ml-1">({a.vehicle.plate})</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{a.departureTime ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{a.returnTime ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSIGNMENT_STATUS_COLORS[a.status]}`}>
                        {ASSIGNMENT_STATUS_LABELS[a.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/operacional/${a.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(a.id)}
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {pagination.total} registro{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
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
        title="Excluir registro"
        description="Tem certeza que deseja excluir este registro de deslocamento?"
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
