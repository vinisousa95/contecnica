"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import { reformItemSchema, type ReformItemInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, HardHat, Pencil, PowerOff, Search } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  DEMOLITION: "Demolição",
  PAINTING: "Pintura",
  MASONRY: "Alvenaria",
  ELECTRICAL: "Elétrica",
  PLUMBING: "Hidráulica",
  FINISHING: "Acabamento",
  CLEANING: "Limpeza",
  JOINERY: "Marcenaria",
  TILING: "Revestimentos",
  CARPENTRY: "Carpintaria",
  OTHERS: "Outros",
};

const UNIT_LABELS: Record<string, string> = {
  UNIT: "un",
  SQM: "m²",
  M: "m",
  DAILY: "diária",
  SERVICE: "serviço",
  POINT: "ponto",
  HOUR: "hora",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const UNITS = Object.keys(UNIT_LABELS);

export default function ItensReformaPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reform-items", search, category, activeOnly],
    queryFn: () =>
      api.reformItems.list({
        ...(search && { search }),
        ...(category && { category }),
        activeOnly: String(activeOnly),
      }) as Promise<any>,
  });

  const items = Array.isArray(data) ? data : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReformItemInput>({
    resolver: zodResolver(reformItemSchema),
    defaultValues: {
      unit: "UNIT",
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ReformItemInput) => api.reformItems.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      toast({ title: "Item criado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar", description: err.message, variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReformItemInput }) =>
      api.reformItems.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      toast({ title: "Item atualizado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.reformItems.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      toast({ title: "Item desativado", variant: "success" });
      setDeactivateId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao desativar", description: err.message, variant: "error" });
    },
  });

  const handleEdit = (item: any) => {
    setEditItem(item);
    reset({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      unit: item.unit,
      priceLow: String(item.priceLow),
      priceMedium: String(item.priceMedium),
      priceHigh: String(item.priceHigh),
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditItem(null);
    reset({
      name: "",
      description: "",
      category: undefined,
      unit: "UNIT",
      priceLow: "",
      priceMedium: "",
      priceHigh: "",
      isActive: true,
      sortOrder: 0,
    });
  };

  const onSubmit = (data: ReformItemInput) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Itens de Reforma"
        description="Catálogo de serviços e materiais com preços por padrão"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Novo Item
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="w-44"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Somente ativos
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <HardHat className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Nenhum item encontrado.</p>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Criar Primeiro Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Preço Baixo</TableHead>
                  <TableHead className="text-right">Preço Médio</TableHead>
                  <TableHead className="text-right">Preço Alto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {UNIT_LABELS[item.unit]}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">
                      {formatCurrency(item.priceLow)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">
                      {formatCurrency(item.priceMedium)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.priceHigh)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? ("success" as const) : ("default" as const)}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {item.isActive && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-amber-500 hover:text-amber-700"
                            onClick={() => setDeactivateId(item.id)}
                          >
                            <PowerOff className="h-3.5 w-3.5" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Item" : "Novo Item de Reforma"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input {...register("name")} placeholder="Ex: Pintura interna tinta PVA" error={errors.name?.message} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <Textarea {...register("description")} rows={2} placeholder="Detalhes do serviço ou material..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <Select {...register("category")} error={(errors.category as any)?.message}>
                  <option value="">Selecione...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <Select {...register("unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Baixo <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("priceLow")}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  error={errors.priceLow?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Médio <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("priceMedium")}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  error={errors.priceMedium?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Alto <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("priceHigh")}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  error={errors.priceHigh?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordem de exibição
              </label>
              <Input
                {...register("sortOrder", { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {editItem ? "Salvar Alterações" : "Criar Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        title="Desativar item?"
        description="O item não aparecerá em novos orçamentos, mas orçamentos existentes não serão afetados."
        confirmLabel="Desativar"
        onConfirm={() => deactivateId && deactivateMutation.mutate(deactivateId)}
        loading={deactivateMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
