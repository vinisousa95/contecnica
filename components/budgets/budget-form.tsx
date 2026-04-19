"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetInput } from "@/lib/validations";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Package,
} from "lucide-react";
import { useCepLookup } from "@/hooks/use-cep-lookup";

// ── Constants ─────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
  HIGH: "Preço Alto",
  MEDIUM: "Preço Médio",
  LOW: "Preço Baixo",
};

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

// ── Types ──────────────────────────────────────────────────────
interface ReformItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  priceLow: number;
  priceMedium: number;
  priceHigh: number;
  isActive: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface BudgetFormProps {
  defaultValues?: Partial<BudgetInput>;
  onSubmit: (data: BudgetInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

// ── Price helper ───────────────────────────────────────────────
function getPriceForTier(item: ReformItem, tier: string): number {
  if (tier === "HIGH") return item.priceHigh;
  if (tier === "MEDIUM") return item.priceMedium;
  return item.priceLow;
}

// ── Item Selector Modal ────────────────────────────────────────
function ItemSelectorModal({
  reformItems,
  selectedIds,
  tier,
  onSelect,
  onClose,
}: {
  reformItems: ReformItem[];
  selectedIds: Set<string>;
  tier: string;
  onSelect: (item: ReformItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filtered = reformItems.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce<Record<string, ReformItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Expand all categories on mount
  useEffect(() => {
    setExpandedCategories(new Set(Object.keys(grouped)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Adicionar itens do catálogo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full text-left py-1.5"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {CATEGORY_LABELS[category]} ({items.length})
                </span>
              </button>

              {expandedCategories.has(category) && (
                <div className="space-y-1 ml-6">
                  {items.map((item) => {
                    const price = getPriceForTier(item, tier);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left",
                          isSelected
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold">{formatCurrency(price)}</p>
                          <p className="text-xs text-gray-500">{UNIT_LABELS[item.unit]}</p>
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Nenhum item encontrado.</p>
          )}
        </div>

        <div className="px-5 py-4 border-t">
          <Button type="button" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────
export function BudgetForm({ defaultValues, onSubmit, isLoading, submitLabel = "Salvar Orçamento" }: BudgetFormProps) {
  const [showItemSelector, setShowItemSelector] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients-simple"],
    queryFn: () => api.clients.list({ limit: "500" }) as Promise<Client[]>,
    select: (data: any) => (Array.isArray(data) ? data : []),
  });

  const { data: reformItems = [] } = useQuery<ReformItem[]>({
    queryKey: ["reform-items-active"],
    queryFn: () => api.reformItems.list({ activeOnly: "true" }) as Promise<ReformItem[]>,
    select: (data: any) => (Array.isArray(data) ? data : []),
  });

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      clientId: "",
      title: "",
      tier: "MEDIUM",
      status: "DRAFT",
      notes: "",
      discount: 0,
      validUntil: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      items: [],
      extraItems: [],
      ...defaultValues,
    },
  });

  const { register, control, watch, setValue, formState: { errors }, handleSubmit } = form;

  const { lookupCep, isLookingUp: isLookingUpCep } = useCepLookup(setValue);

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });

  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({
    control,
    name: "extraItems",
  });

  const watchedTier = watch("tier");
  const watchedItems = watch("items");
  const watchedExtras = watch("extraItems");
  const watchedDiscount = watch("discount") ?? 0;

  // Re-price items when tier changes
  const repricedRef = useRef(false);
  useEffect(() => {
    if (repricedRef.current) {
      watchedItems.forEach((item, idx) => {
        const reformItem = reformItems.find((r) => r.id === item.reformItemId);
        if (reformItem) {
          const newPrice = getPriceForTier(reformItem, watchedTier);
          setValue(`items.${idx}.unitPrice`, newPrice);
          setValue(`items.${idx}.subtotal`, newPrice * item.quantity);
        }
      });
    }
    repricedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTier]);

  // Calculate totals
  const itemsTotal = watchedItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const extrasTotal = watchedExtras.reduce((s, e) => s + (e.subtotal ?? 0), 0);
  const subtotalBeforeDiscount = itemsTotal + extrasTotal;
  const discountAmount = subtotalBeforeDiscount * ((watchedDiscount ?? 0) / 100);
  const grandTotal = subtotalBeforeDiscount - discountAmount;

  const selectedItemIds = new Set(watchedItems.map((i) => i.reformItemId));

  const handleSelectItem = useCallback(
    (reformItem: ReformItem) => {
      const alreadyIdx = watchedItems.findIndex((i) => i.reformItemId === reformItem.id);
      if (alreadyIdx !== -1) {
        removeItem(alreadyIdx);
        return;
      }
      const unitPrice = getPriceForTier(reformItem, watchedTier);
      appendItem({
        reformItemId: reformItem.id,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
      });
    },
    [watchedItems, watchedTier, appendItem, removeItem]
  );

  const handleItemQuantityChange = (idx: number, qty: number) => {
    const price = watchedItems[idx]?.unitPrice ?? 0;
    setValue(`items.${idx}.quantity`, qty);
    setValue(`items.${idx}.subtotal`, qty * price);
  };

  const handleExtraChange = (idx: number, field: "quantity" | "unitPrice", value: number) => {
    const current = watchedExtras[idx];
    const qty = field === "quantity" ? value : current?.quantity ?? 0;
    const price = field === "unitPrice" ? value : current?.unitPrice ?? 0;
    setValue(`extraItems.${idx}.${field}`, value);
    setValue(`extraItems.${idx}.subtotal`, qty * price);
  };

  const getReformItemData = (reformItemId: string) =>
    reformItems.find((r) => r.id === reformItemId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Orçamento <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("title")}
                placeholder="Ex: Reforma completa sala e cozinha"
                error={errors.title?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                {...register("clientId")}
                className="flex h-9 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.clientId?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Preço <span className="text-red-500">*</span>
              </label>
              <select
                {...register("tier")}
                className="flex h-9 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
              >
                <option value="LOW">Preço Baixo</option>
                <option value="MEDIUM">Preço Médio</option>
                <option value="HIGH">Preço Alto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
              <Input type="date" {...register("validUntil")} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register("status")}
                className="flex h-9 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
              >
                <option value="DRAFT">Rascunho</option>
                <option value="UNDER_REVIEW">Em Revisão</option>
                <option value="SENT">Enviado</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Recusado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <Textarea {...register("notes")} rows={3} placeholder="Observações gerais sobre o orçamento..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <Input
                disabled={isLookingUpCep}
                placeholder="00000-000"
                {...register("zipCode", {
                  onChange: (e) => lookupCep(e.target.value),
                })}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rua / Logradouro</label>
              <Input {...register("street")} placeholder="Nome da rua" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <Input {...register("number")} placeholder="Nº" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <Input {...register("complement")} placeholder="Apto, sala..." />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <Input {...register("neighborhood")} placeholder="Bairro" />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <Input {...register("city")} placeholder="Cidade" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <Input {...register("state")} placeholder="UF" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Itens do Catálogo</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowItemSelector(true)}
            >
              <Package className="h-4 w-4" />
              Selecionar Itens
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemFields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhum item selecionado.</p>
              <p className="text-xs text-gray-400 mt-1">
                Clique em "Selecionar Itens" para adicionar itens do catálogo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-medium">Item</th>
                    <th className="text-right py-2 text-gray-600 font-medium w-24">Qtd</th>
                    <th className="text-right py-2 text-gray-600 font-medium w-28">Unit. ({TIER_LABELS[watchedTier]})</th>
                    <th className="text-right py-2 text-gray-600 font-medium w-28">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemFields.map((field, idx) => {
                    const ri = getReformItemData(field.reformItemId);
                    const item = watchedItems[idx];
                    return (
                      <tr key={field.id}>
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-900">{ri?.name ?? "Item"}</p>
                          {ri?.description && (
                            <p className="text-xs text-gray-500">{ri.description}</p>
                          )}
                          <span className="text-xs text-gray-400">
                            {ri ? CATEGORY_LABELS[ri.category] : ""}
                          </span>
                        </td>
                        <td className="py-2 w-24">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item?.quantity ?? 1}
                            onChange={(e) =>
                              handleItemQuantityChange(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {formatCurrency(item?.unitPrice ?? 0)}
                          <span className="text-xs text-gray-400 ml-1">
                            /{ri ? UNIT_LABELS[ri.unit] : ""}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {formatCurrency(item?.subtotal ?? 0)}
                        </td>
                        <td className="py-2 pl-2">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="py-2 text-right text-sm font-medium text-gray-600">
                      Subtotal itens catálogo:
                    </td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(itemsTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extra Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Itens Extras (Avulsos)</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendExtra({
                  name: "",
                  description: "",
                  quantity: 1,
                  unit: "UNIT",
                  unitPrice: 0,
                  subtotal: 0,
                })
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {extraFields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum item extra. Use para serviços ou materiais fora do catálogo.
            </p>
          ) : (
            <div className="space-y-3">
              {extraFields.map((field, idx) => {
                const extra = watchedExtras[idx];
                return (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          {...register(`extraItems.${idx}.name`)}
                          placeholder="Nome do item *"
                          error={(errors.extraItems?.[idx] as any)?.name?.message}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExtra(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      {...register(`extraItems.${idx}.description`)}
                      placeholder="Descrição (opcional)"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Qtd</label>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={extra?.quantity ?? 1}
                          onChange={(e) =>
                            handleExtraChange(idx, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Unid.</label>
                        <select
                          {...register(`extraItems.${idx}.unit`)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(UNIT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Valor Unit.</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={extra?.unitPrice ?? 0}
                          onChange={(e) =>
                            handleExtraChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Subtotal</label>
                        <div className="border border-gray-100 bg-gray-50 rounded px-2 py-1.5 text-sm font-medium text-gray-700">
                          {formatCurrency(extra?.subtotal ?? 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {extraFields.length > 0 && (
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">
                Subtotal itens extras:{" "}
                <span className="text-gray-900 font-semibold">{formatCurrency(extrasTotal)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-700 font-medium">
              Padrão: {TIER_LABELS[watchedTier]} · {itemFields.length} item(ns) + {extraFields.length} extra(s)
            </p>
          </div>
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotalBeforeDiscount)}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-blue-700 font-medium whitespace-nowrap">Desconto (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register("discount", { valueAsNumber: true })}
              className="w-24 h-8 px-2 rounded-md border border-blue-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              placeholder="0"
            />
            {discountAmount > 0 && (
              <span className="text-sm text-green-700 font-medium ml-auto">
                − {formatCurrency(discountAmount)}
              </span>
            )}
          </div>
          <div className="border-t border-blue-200 pt-2 flex items-center justify-between">
            <p className="text-sm text-blue-700 font-semibold">Total do Orçamento</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(grandTotal)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {submitLabel}
        </Button>
      </div>

      {/* Item selector modal */}
      {showItemSelector && (
        <ItemSelectorModal
          reformItems={reformItems}
          selectedIds={selectedItemIds}
          tier={watchedTier}
          onSelect={handleSelectItem}
          onClose={() => setShowItemSelector(false)}
        />
      )}
    </form>
  );
}
