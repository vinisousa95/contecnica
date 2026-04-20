"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import {
  reformItemSchema,
  type ReformItemInput,
  reformPackageSchema,
  type ReformPackageInput,
} from "@/lib/validations";
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
import { Plus, HardHat, Pencil, PowerOff, Search, Trash2, LayoutGrid, List } from "lucide-react";

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
  ML: "ml",
  DAILY: "diária",
  SERVICE: "serviço",
  POINT: "ponto",
  HOUR: "hora",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const UNITS = Object.keys(UNIT_LABELS);

// ─── Items Section ────────────────────────────────────────────────────────────

function ItemsSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [hardDeleteId, setHardDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reform-items", search, category, activeOnly],
    queryFn: () =>
      api.reformItems.list({
        ...(search && { search }),
        ...(category && { category }),
        activeOnly: String(activeOnly),
      }) as Promise<any>,
  });

  const { data: customCatsData } = useQuery({
    queryKey: ["reform-items-custom-cats"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/v1/reform-items/categories");
        if (!res.ok) return [] as string[];
        const json = await res.json();
        return (json.data ?? []) as string[];
      } catch {
        return [] as string[];
      }
    },
    staleTime: 0,
  });

  const items = Array.isArray(data) ? data : [];

  const customCats: string[] = Array.from(
    new Set([
      ...(customCatsData ?? []),
      ...(items as any[])
        .map((i) => i.customCategory)
        .filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0),
    ])
  ).sort();

  const [pctMedium, setPctMedium] = useState<string>("");
  const [pctHigh, setPctHigh] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReformItemInput>({
    resolver: zodResolver(reformItemSchema),
    defaultValues: { unit: "UNIT", isActive: true, sortOrder: 0 },
  });

  const watchedPriceLow = useWatch({ control, name: "priceLow" });
  const watchedCategory = useWatch({ control, name: "category" });
  const watchedCustomCategory = useWatch({ control, name: "customCategory" });

  const categoryDisplayValue =
    watchedCategory === "OTHERS" && watchedCustomCategory && customCats.includes(watchedCustomCategory)
      ? watchedCustomCategory
      : (watchedCategory as string | undefined) ?? "";

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (customCats.includes(val)) {
      setValue("category", "OTHERS" as any, { shouldValidate: true });
      setValue("customCategory", val);
    } else if (val === "OTHERS") {
      setValue("category", "OTHERS" as any, { shouldValidate: true });
      setValue("customCategory", "");
    } else {
      setValue("category", (val || undefined) as any, { shouldValidate: true });
      setValue("customCategory", "");
    }
  };

  const applyPct = useCallback(
    (pct: string, field: "priceMedium" | "priceHigh") => {
      const base = parseFloat(String(watchedPriceLow));
      const p = parseFloat(pct);
      if (!isNaN(base) && base > 0 && !isNaN(p) && p >= 0) {
        setValue(field, String((base * (1 + p / 100)).toFixed(2)));
      }
    },
    [watchedPriceLow, setValue]
  );

  const createMutation = useMutation({
    mutationFn: (data: ReformItemInput) => api.reformItems.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      queryClient.invalidateQueries({ queryKey: ["reform-items-custom-cats"] });
      toast({ title: "Item criado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => toast({ title: "Erro ao criar", description: err.message, variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReformItemInput }) =>
      api.reformItems.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      queryClient.invalidateQueries({ queryKey: ["reform-items-custom-cats"] });
      toast({ title: "Item atualizado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "error" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.reformItems.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      toast({ title: "Item desativado", variant: "success" });
      setDeactivateId(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao desativar", description: err.message, variant: "error" }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/reform-items/${id}?hard=true`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Erro ao excluir");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-items"] });
      queryClient.invalidateQueries({ queryKey: ["reform-items-custom-cats"] });
      toast({ title: "Item excluído permanentemente", variant: "success" });
      setHardDeleteId(null);
    },
    onError: (err: Error) =>
      toast({ title: "Não foi possível excluir", description: err.message, variant: "error" }),
  });

  const handleEdit = (item: any) => {
    setEditItem(item);
    setPctMedium("");
    setPctHigh("");
    reset({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      customCategory: item.customCategory ?? "",
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
    setPctMedium("");
    setPctHigh("");
    reset({ name: "", description: "", category: undefined, unit: "UNIT", priceLow: "", priceMedium: "", priceHigh: "", isActive: true, sortOrder: 0 });
  };

  const onSubmit = (data: ReformItemInput) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data });
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            className="w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: "Todas as categorias" },
              ...CATEGORIES.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] })),
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="rounded border-gray-300" />
            Somente ativos
          </label>
        </div>
        <Button size="sm" className="ml-3" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

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
                      {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{item.customCategory || CATEGORY_LABELS[item.category]}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{UNIT_LABELS[item.unit]}</TableCell>
                    <TableCell className="text-right text-sm text-gray-700">{formatCurrency(item.priceLow)}</TableCell>
                    <TableCell className="text-right text-sm text-gray-700">{formatCurrency(item.priceMedium)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">{formatCurrency(item.priceHigh)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? ("success" as const) : ("default" as const)}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {item.isActive && (
                          <Button variant="ghost" size="icon-sm" className="text-amber-500 hover:text-amber-700" onClick={() => setDeactivateId(item.id)}>
                            <PowerOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-700" onClick={() => setHardDeleteId(item.id)} title="Excluir permanentemente">
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
            <input type="hidden" {...register("category")} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <Select
                  value={categoryDisplayValue}
                  onChange={handleCategoryChange}
                  error={(errors.category as any)?.message}
                  options={[
                    { value: "", label: "Selecione..." },
                    ...CATEGORIES.filter((c) => c !== "OTHERS").map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] })),
                    ...customCats.map((cc) => ({ value: cc, label: cc })),
                    { value: "OTHERS", label: "+ Nova categoria..." },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <Select {...register("unit")} options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))} />
              </div>
            </div>
            {watchedCategory === "OTHERS" && !customCats.includes(watchedCustomCategory ?? "") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da nova categoria <span className="text-red-500">*</span>
                </label>
                <Input {...register("customCategory")} placeholder="Ex: Impermeabilização, Gesso, Serralheria..." />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Baixo <span className="text-red-500">*</span>
                </label>
                <Input {...register("priceLow")} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceLow?.message} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Médio <span className="text-red-500">*</span>
                </label>
                <Input {...register("priceMedium")} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceMedium?.message} />
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number" min="0" max="999" step="0.1" value={pctMedium}
                    onChange={(e) => { setPctMedium(e.target.value); applyPct(e.target.value, "priceMedium"); }}
                    placeholder="%"
                    className="w-16 h-7 px-2 rounded border border-gray-300 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                  />
                  <span className="text-xs text-gray-400">% acima do baixo</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Alto <span className="text-red-500">*</span>
                </label>
                <Input {...register("priceHigh")} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceHigh?.message} />
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number" min="0" max="999" step="0.1" value={pctHigh}
                    onChange={(e) => { setPctHigh(e.target.value); applyPct(e.target.value, "priceHigh"); }}
                    placeholder="%"
                    className="w-16 h-7 px-2 rounded border border-gray-300 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                  />
                  <span className="text-xs text-gray-400">% acima do baixo</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de exibição</label>
              <Input {...register("sortOrder", { valueAsNumber: true })} type="number" min="0" placeholder="0" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancelar</Button>
              <Button type="submit" loading={isSaving}>{editItem ? "Salvar Alterações" : "Criar Item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
      <ConfirmDialog
        open={!!hardDeleteId}
        onOpenChange={(open) => !open && setHardDeleteId(null)}
        title="Excluir permanentemente?"
        description="Essa ação não pode ser desfeita. O item será removido do catálogo. Se já foi usado em algum orçamento, a exclusão será bloqueada."
        confirmLabel="Excluir definitivamente"
        onConfirm={() => hardDeleteId && hardDeleteMutation.mutate(hardDeleteId)}
        loading={hardDeleteMutation.isPending}
        variant="danger"
      />
    </>
  );
}

// ─── Packages Section ─────────────────────────────────────────────────────────

type ReformPackageItemPreview = {
  reformItemId?: string;
  unitPriceLow?: number | null;
  unitPriceMedium?: number | null;
  unitPriceHigh?: number | null;
};

const CUSTOM_ITEM_VALUE = "__custom__";

function PackageItemRow({
  index,
  catalogItems,
  register,
  control,
  errors,
  onSelectItem,
  onRemove,
  defaultReformItemId,
}: {
  index: number;
  catalogItems: any[];
  register: any;
  control: any;
  errors: any;
  onSelectItem: (id: string) => void;
  onRemove: () => void;
  defaultReformItemId?: string;
}) {
  const reformItemId = useWatch({ control, name: `items.${index}.reformItemId` }) ?? defaultReformItemId ?? "";
  const itemName = useWatch({ control, name: `items.${index}.name` }) ?? "";
  const quantity = useWatch({ control, name: `items.${index}.quantity` }) ?? 1;
  const priceLow = useWatch({ control, name: `items.${index}.unitPriceLow` });
  const priceMedium = useWatch({ control, name: `items.${index}.unitPriceMedium` });
  const priceHigh = useWatch({ control, name: `items.${index}.unitPriceHigh` });

  // "Custom" mode: no reformItemId but has a name
  const isCustom = !reformItemId && itemName.length > 0;
  const selectValue = isCustom ? CUSTOM_ITEM_VALUE : reformItemId;

  const qty = parseFloat(String(quantity)) || 0;
  const totalLow = priceLow != null && priceLow !== "" ? Number(priceLow) * qty : null;
  const totalMedium = priceMedium != null && priceMedium !== "" ? Number(priceMedium) * qty : null;
  const totalHigh = priceHigh != null && priceHigh !== "" ? Number(priceHigh) * qty : null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Select
            value={selectValue}
            onChange={(e) => onSelectItem(e.target.value)}
            error={(errors.items?.[index]?.reformItemId as any)?.message ?? (errors.items?.[index]?.name as any)?.message}
            options={[
              { value: "", label: "Selecione um item do catálogo..." },
              ...catalogItems.map((it: any) => ({
                value: it.id,
                label: `${it.name} (${UNIT_LABELS[it.unit]})`,
              })),
              { value: CUSTOM_ITEM_VALUE, label: "+ Adicionar item personalizado..." },
            ]}
          />
          {/* Hidden inputs keep form values in sync for catalog-based items */}
          <input type="hidden" {...register(`items.${index}.reformItemId`)} />
          {!isCustom && <input type="hidden" {...register(`items.${index}.name`)} />}
          {!isCustom && <input type="hidden" {...register(`items.${index}.unit`)} />}
          {!isCustom && <input type="hidden" {...register(`items.${index}.unitPriceLow`, { valueAsNumber: true })} />}
          {!isCustom && <input type="hidden" {...register(`items.${index}.unitPriceMedium`, { valueAsNumber: true })} />}
          {!isCustom && <input type="hidden" {...register(`items.${index}.unitPriceHigh`, { valueAsNumber: true })} />}
        </div>
        <div className="w-24">
          <Input
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            type="number" step="0.01" min="0.01" placeholder="Qtd"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-red-400 hover:text-red-600 mt-1"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Custom item inputs */}
      {isCustom && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <Input
              {...register(`items.${index}.name`)}
              placeholder="Nome do item personalizado *"
              error={(errors.items?.[index]?.name as any)?.message}
            />
            <div className="w-full sm:w-32">
              <Select
                {...register(`items.${index}.unit`)}
                options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              {...register(`items.${index}.unitPriceLow`, { valueAsNumber: true })}
              type="number" step="0.01" min="0" placeholder="Preço Baixo"
            />
            <Input
              {...register(`items.${index}.unitPriceMedium`, { valueAsNumber: true })}
              type="number" step="0.01" min="0" placeholder="Preço Médio"
            />
            <Input
              {...register(`items.${index}.unitPriceHigh`, { valueAsNumber: true })}
              type="number" step="0.01" min="0" placeholder="Preço Alto"
            />
          </div>
          <p className="text-xs text-gray-400">
            Item avulso — não será salvo no catálogo. Para reutilizar, cadastre-o em "Itens Individuais".
          </p>
        </div>
      )}

      {/* Price preview for catalog items */}
      {!isCustom && reformItemId && (priceLow != null || priceMedium != null || priceHigh != null) && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
          <span>
            Baixo: <strong className="text-gray-700">{formatCurrency(totalLow ?? 0)}</strong>
            <span className="text-gray-400"> ({formatCurrency(Number(priceLow ?? 0))}/un)</span>
          </span>
          <span>
            Médio: <strong className="text-gray-700">{formatCurrency(totalMedium ?? 0)}</strong>
            <span className="text-gray-400"> ({formatCurrency(Number(priceMedium ?? 0))}/un)</span>
          </span>
          <span>
            Alto: <strong className="text-gray-700">{formatCurrency(totalHigh ?? 0)}</strong>
            <span className="text-gray-400"> ({formatCurrency(Number(priceHigh ?? 0))}/un)</span>
          </span>
        </div>
      )}
    </div>
  );
}

function PackagesSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pctMedium, setPctMedium] = useState<string>("");
  const [pctHigh, setPctHigh] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["reform-packages", search],
    queryFn: () =>
      api.reformPackages.list({ ...(search && { search }), activeOnly: "false" }) as Promise<any>,
  });

  const { data: catalogItemsData } = useQuery({
    queryKey: ["reform-items", "", "", true],
    queryFn: () => api.reformItems.list({ activeOnly: "true" }) as Promise<any>,
  });
  const catalogItems = Array.isArray(catalogItemsData) ? catalogItemsData : [];

  const packages = Array.isArray(data) ? data : [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ReformPackageInput>({
    resolver: zodResolver(reformPackageSchema),
    defaultValues: { isActive: true, sortOrder: 0, items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedPriceLow = useWatch({ control, name: "priceLow" });

  const applyPct = useCallback(
    (pct: string, field: "priceMedium" | "priceHigh") => {
      const base = parseFloat(String(watchedPriceLow));
      const p = parseFloat(pct);
      if (!isNaN(base) && base > 0 && !isNaN(p) && p >= 0) {
        setValue(field, parseFloat((base * (1 + p / 100)).toFixed(2)));
      }
    },
    [watchedPriceLow, setValue]
  );

  const handleSelectCatalogItem = (index: number, itemId: string) => {
    if (itemId === CUSTOM_ITEM_VALUE) {
      // Switch to custom mode — clear catalog link, keep blank fields for user input
      setValue(`items.${index}.reformItemId`, "");
      setValue(`items.${index}.name`, " ");
      setValue(`items.${index}.unit`, "UNIT");
      setValue(`items.${index}.unitPriceLow`, null);
      setValue(`items.${index}.unitPriceMedium`, null);
      setValue(`items.${index}.unitPriceHigh`, null);
      return;
    }
    const item = catalogItems.find((i: any) => i.id === itemId);
    if (!item) {
      setValue(`items.${index}.reformItemId`, "");
      setValue(`items.${index}.name`, "");
      return;
    }
    setValue(`items.${index}.reformItemId`, item.id);
    setValue(`items.${index}.name`, item.name);
    setValue(`items.${index}.unit`, item.unit);
    setValue(`items.${index}.unitPriceLow`, item.priceLow);
    setValue(`items.${index}.unitPriceMedium`, item.priceMedium);
    setValue(`items.${index}.unitPriceHigh`, item.priceHigh);
  };

  const createMutation = useMutation({
    mutationFn: (data: ReformPackageInput) => api.reformPackages.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-packages"] });
      toast({ title: "Ambiente criado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => toast({ title: "Erro ao criar", description: err.message, variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReformPackageInput }) =>
      api.reformPackages.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-packages"] });
      toast({ title: "Ambiente atualizado!", variant: "success" });
      handleCloseForm();
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reformPackages.delete(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reform-packages"] });
      toast({ title: "Ambiente excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao excluir", description: err.message, variant: "error" }),
  });

  const handleEdit = (pkg: any) => {
    setEditPkg(pkg);
    setPctMedium("");
    setPctHigh("");
    reset({
      name: pkg.name,
      description: pkg.description ?? "",
      category: pkg.category ?? "OTHERS",
      customCategory: pkg.customCategory ?? "",
      priceLow: pkg.priceLow,
      priceMedium: pkg.priceMedium,
      priceHigh: pkg.priceHigh,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
      items: (pkg.items ?? []).map((it: any) => ({
        id: it.id,
        reformItemId: it.reformItemId ?? "",
        name: it.name,
        description: it.description ?? "",
        quantity: it.quantity,
        unit: it.unit,
        unitPriceLow: it.unitPriceLow ?? null,
        unitPriceMedium: it.unitPriceMedium ?? null,
        unitPriceHigh: it.unitPriceHigh ?? null,
        sortOrder: it.sortOrder,
      })),
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditPkg(null);
    setPctMedium("");
    setPctHigh("");
    reset({ name: "", description: "", category: "OTHERS", customCategory: "", priceLow: 0, priceMedium: 0, priceHigh: 0, isActive: true, sortOrder: 0, items: [] });
  };

  const onSubmit = (data: ReformPackageInput) => {
    if (editPkg) updateMutation.mutate({ id: editPkg.id, data });
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar ambiente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="ml-3" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo Ambiente
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <LayoutGrid className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Nenhum ambiente cadastrado.</p>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Criar Primeiro Ambiente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Ambiente</TableHead>
                  <TableHead>Itens incluídos</TableHead>
                  <TableHead className="text-right">Valor Baixo</TableHead>
                  <TableHead className="text-right">Valor Médio</TableHead>
                  <TableHead className="text-right">Valor Alto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg: any) => (
                  <TableRow key={pkg.id} className={!pkg.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <p className="font-medium text-gray-900">{pkg.name}</p>
                      {pkg.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pkg.description}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(pkg.items ?? []).slice(0, 4).map((it: any) => (
                          <span key={it.id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {it.name}
                          </span>
                        ))}
                        {(pkg.items ?? []).length > 4 && (
                          <span className="text-xs text-gray-400">+{pkg.items.length - 4} mais</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">{formatCurrency(pkg.priceLow)}</TableCell>
                    <TableCell className="text-right text-sm text-gray-700">{formatCurrency(pkg.priceMedium)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">{formatCurrency(pkg.priceHigh)}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.isActive ? ("success" as const) : ("default" as const)}>
                        {pkg.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(pkg.id)}>
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

      {/* Package Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPkg ? "Editar Ambiente" : "Novo Ambiente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Ambiente <span className="text-red-500">*</span>
                </label>
                <Input {...register("name")} placeholder="Ex: Banheiro Completo, Cozinha, Sala..." error={errors.name?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <Textarea {...register("description")} rows={2} placeholder="Descreva o que está incluído neste ambiente..." />
              </div>
            </div>

            {/* Prices */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Valor Total do Ambiente <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Informe o valor total do ambiente completo. Os preços individuais dos itens não aparecerão no orçamento.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Padrão Baixo</label>
                  <Input {...register("priceLow", { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceLow?.message} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Padrão Médio</label>
                  <Input {...register("priceMedium", { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceMedium?.message} />
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number" min="0" max="999" step="0.1" value={pctMedium}
                      onChange={(e) => { setPctMedium(e.target.value); applyPct(e.target.value, "priceMedium"); }}
                      placeholder="%"
                      className="w-16 h-7 px-2 rounded border border-gray-300 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                    />
                    <span className="text-xs text-gray-400">% acima do baixo</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Padrão Alto</label>
                  <Input {...register("priceHigh", { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0,00" error={errors.priceHigh?.message} />
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number" min="0" max="999" step="0.1" value={pctHigh}
                      onChange={(e) => { setPctHigh(e.target.value); applyPct(e.target.value, "priceHigh"); }}
                      placeholder="%"
                      className="w-16 h-7 px-2 rounded border border-gray-300 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                    />
                    <span className="text-xs text-gray-400">% acima do baixo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Itens do Ambiente</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ reformItemId: "", name: "", description: "", quantity: 1, unit: "UNIT", unitPriceLow: null, unitPriceMedium: null, unitPriceHigh: null, sortOrder: fields.length })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Item
                </Button>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Selecione itens do catálogo. Os valores individuais ficam visíveis aqui para referência interna, mas <strong>não aparecem no orçamento do cliente</strong> — apenas o total do ambiente.
              </p>
              {fields.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center">
                  <p className="text-sm text-gray-400">Nenhum item adicionado ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const itemValues = (field as any) as ReformPackageItemPreview;
                    return (
                      <PackageItemRow
                        key={field.id}
                        index={index}
                        catalogItems={catalogItems}
                        register={register}
                        control={control}
                        errors={errors}
                        onSelectItem={(itemId) => handleSelectCatalogItem(index, itemId)}
                        onRemove={() => remove(index)}
                        defaultReformItemId={itemValues.reformItemId}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancelar</Button>
              <Button type="submit" loading={isSaving}>{editPkg ? "Salvar Alterações" : "Criar Ambiente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir ambiente?"
        description="O ambiente e todos os seus itens serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItensReformaPage() {
  const [tab, setTab] = useState<"items" | "packages">("items");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Itens de Reforma"
        description="Catálogo de serviços, materiais e ambientes completos"
      />

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "items" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <List className="h-4 w-4" />
          Itens Individuais
        </button>
        <button
          type="button"
          onClick={() => setTab("packages")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "packages" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Ambientes
        </button>
      </div>

      {tab === "items" ? <ItemsSection /> : <PackagesSection />}
    </div>
  );
}
