"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  HardHat,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PLANNING", label: "Planejamento" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "PAUSED", label: "Pausada" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "CANCELLED", label: "Cancelada" },
];

export default function ObrasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", search, status],
    queryFn: () =>
      api.projects.list({
        ...(search && { search }),
        ...(status && { status }),
      }) as Promise<any>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Obra excluída", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const projects = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Obras"
        description="Acompanhe todas as obras e reformas"
        actions={
          <Button asChild>
            <Link href="/obras/nova">
              <Plus className="h-4 w-4" />
              Nova Obra
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, cliente..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-52"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={<HardHat className="h-12 w-12" />}
              title="Nenhuma obra encontrada"
              description={search ? "Tente mudar os termos da busca." : "Cadastre a primeira obra."}
              action={
                !search && (
                  <Button asChild size="sm">
                    <Link href="/obras/nova">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={() => setDeleteId(project.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir obra"
        description="Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: any; onDelete: () => void }) {
  const budgetPercent = project.budget
    ? Math.min(100, Math.round((project.totalExpenses / project.budget) * 100))
    : null;

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/obras/${project.id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 text-sm line-clamp-2"
            >
              {project.name}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{project.client?.name}</p>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>

        {(project.city || project.street) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {[project.street, project.city, project.state].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-xs text-gray-400">Orçamento</p>
            <p className="text-sm font-semibold text-gray-700">
              {project.budget ? formatCurrency(project.budget) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Custo real</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatCurrency(project.totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Receitas</p>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(project.totalRevenues)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Margem</p>
            <p className={`text-sm font-semibold flex items-center gap-1 ${
              project.margin >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {project.margin >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {formatCurrency(project.margin)}
            </p>
          </div>
        </div>

        {budgetPercent !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Orçamento utilizado</span>
              <span
                className={`font-medium ${
                  budgetPercent > 90 ? "text-red-600" : budgetPercent > 70 ? "text-amber-600" : "text-gray-600"
                }`}
              >
                {budgetPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPercent > 90 ? "bg-red-500" : budgetPercent > 70 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}

        {(project.startDate || project.expectedEndDate) && (
          <div className="mt-3 flex gap-4 text-xs text-gray-400">
            {project.startDate && <span>Início: {formatDate(project.startDate)}</span>}
            {project.expectedEndDate && (
              <span>Previsão: {formatDate(project.expectedEndDate)}</span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/obras/${project.id}`}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/obras/${project.id}/editar`}>
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
