"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  LayoutGrid,
  ArrowLeft,
  Pencil,
  Copy,
} from "lucide-react";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { maskCep } from "@/lib/masks";
import { ExtraItemAutocomplete } from "./extra-item-autocomplete";

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
  ML: "ml",
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

interface ReformPackage {
  id: string;
  name: string;
  description?: string | null;
  priceLow: number;
  priceMedium: number;
  priceHigh: number;
  isActive: boolean;
  items?: Array<{ name: string; quantity: number; unit: string }>;
}

interface Client {
  id: string;
  name: string;
}

interface CreateItemForm {
  name: string;
  description: string;
  category: string;
  unit: string;
  priceLow: string;
  priceMedium: string;
  priceHigh: string;
}

const EMPTY_CREATE_FORM: CreateItemForm = {
  name: "",
  description: "",
  category: "OTHERS",
  unit: "UNIT",
  priceLow: "",
  priceMedium: "",
  priceHigh: "",
};

interface BudgetFormProps {
  defaultValues?: Partial<BudgetInput>;
  onSubmit: (data: BudgetInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

// ── Price helper ───────────────────────────────────────────────
function getPriceForTier(item: { priceLow: number; priceMedium: number; priceHigh: number }, tier: string): number {
  if (tier === "HIGH") return item.priceHigh;
  if (tier === "MEDIUM") return item.priceMedium;
  return item.priceLow;
}

// ── Item Selector Modal ────────────────────────────────────────
function ItemSelectorModal({
  reformItems,
  reformPackages,
  selectedIds,
  selectedPackageIds,
  tier,
  onSelect,
  onSelectPackage,
  onClose,
  onCreateAndSelect,
}: {
  reformItems: ReformItem[];
  reformPackages: ReformPackage[];
  selectedIds: Set<string>;
  selectedPackageIds: Set<string>;
  tier: string;
  onSelect: (item: ReformItem) => void;
  onSelectPackage: (pkg: ReformPackage) => void;
  onClose: () => void;
  onCreateAndSelect: (form: CreateItemForm) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateItemForm>(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const filtered = reformItems.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredPackages = reformPackages.filter((pkg) => {
    if (categoryFilter) return false; // packages don't have categories
    return (
      !search ||
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(search.toLowerCase())
    );
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!createForm.name || createForm.name.length < 2) errs.name = "Nome obrigatório (mín. 2 caracteres)";
    if (!createForm.priceLow) errs.priceLow = "Preço baixo obrigatório";
    if (!createForm.priceMedium) errs.priceMedium = "Preço médio obrigatório";
    if (!createForm.priceHigh) errs.priceHigh = "Preço alto obrigatório";
    if (Object.keys(errs).length > 0) { setCreateErrors(errs); return; }
    setCreating(true);
    try {
      await onCreateAndSelect(createForm);
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateErrors({});
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          {showCreate ? (
            <button
              onClick={() => { setShowCreate(false); setCreateErrors({}); }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao catálogo
            </button>
          ) : (
            <h2 className="text-base font-semibold text-gray-900">Adicionar itens do catálogo</h2>
          )}
          <div className="flex items-center gap-3">
            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#EA580C] hover:text-[#C2410C] border border-[#EA580C]/30 rounded-lg px-2.5 py-1.5 hover:bg-orange-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar novo item
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Create form panel */}
        {showCreate && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm text-orange-700">
              O item será salvo no catálogo e adicionado ao orçamento automaticamente.
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do item *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Instalação de tomada"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
                {createErrors.name && <p className="text-xs text-red-500 mt-1">{createErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detalhes adicionais (opcional)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                  <select
                    value={createForm.unit}
                    onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    {Object.entries(UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Preços por padrão (R$)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Preço Baixo *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.priceLow}
                      onChange={(e) => setCreateForm((f) => ({ ...f, priceLow: e.target.value }))}
                      placeholder="0,00"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    />
                    {createErrors.priceLow && <p className="text-xs text-red-500 mt-1">{createErrors.priceLow}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Preço Médio *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.priceMedium}
                      onChange={(e) => setCreateForm((f) => ({ ...f, priceMedium: e.target.value }))}
                      placeholder="0,00"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    />
                    {createErrors.priceMedium && <p className="text-xs text-red-500 mt-1">{createErrors.priceMedium}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Preço Alto *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.priceHigh}
                      onChange={(e) => setCreateForm((f) => ({ ...f, priceHigh: e.target.value }))}
                      placeholder="0,00"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    />
                    {createErrors.priceHigh && <p className="text-xs text-red-500 mt-1">{createErrors.priceHigh}</p>}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateErrors({}); }}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 text-sm bg-[#EA580C] text-white rounded-lg px-4 py-2 hover:bg-[#C2410C] transition-colors disabled:opacity-50"
                >
                  {creating ? "Salvando…" : "Criar e Adicionar ao Orçamento"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters — only shown when not creating */}
        {!showCreate && (
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
        )}

        {/* Item list */}
        {!showCreate && (
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {/* Packages (Ambientes) */}
          {filteredPackages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 py-1.5">
                <LayoutGrid className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                  Ambientes ({filteredPackages.length})
                </span>
              </div>
              <div className="space-y-1 ml-6">
                {filteredPackages.map((pkg) => {
                  const price = getPriceForTier(pkg, tier);
                  const isSelected = selectedPackageIds.has(pkg.id);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => onSelectPackage(pkg)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left",
                        isSelected
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-orange-100 bg-orange-50/30 hover:border-orange-300 hover:bg-orange-50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          <LayoutGrid className="h-3.5 w-3.5 inline mr-1 -mt-0.5 text-orange-500" />
                          {pkg.name}
                        </p>
                        {pkg.description ? (
                          <p className="text-xs text-gray-500 truncate">{pkg.description}</p>
                        ) : (
                          pkg.items && pkg.items.length > 0 && (
                            <p className="text-xs text-gray-500 truncate">
                              {pkg.items.length} {pkg.items.length === 1 ? "item" : "itens"}: {pkg.items.slice(0, 3).map((i) => i.name).join(", ")}
                              {pkg.items.length > 3 ? "…" : ""}
                            </p>
                          )
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">{formatCurrency(price)}</p>
                        <p className="text-xs text-gray-500">total</p>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          isSelected ? "border-orange-600 bg-orange-600" : "border-gray-300"
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
            </div>
          )}

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
          {Object.keys(grouped).length === 0 && filteredPackages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Nenhum item encontrado.</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-3 text-xs text-[#EA580C] hover:underline"
              >
                + Criar novo item no catálogo
              </button>
            </div>
          )}
        </div>
        )}

        {!showCreate && (
        <div className="px-5 py-4 border-t">
          <Button type="button" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────
export function BudgetForm({ defaultValues, onSubmit, isLoading, submitLabel = "Salvar Orçamento" }: BudgetFormProps) {
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editedRoomName, setEditedRoomName] = useState("");
  const [copyingRoom, setCopyingRoom] = useState<string | null>(null);
  const [copyTargetName, setCopyTargetName] = useState("");
  const [focusExtraIdx, setFocusExtraIdx] = useState<number | null>(null);
  const [discountValueStr, setDiscountValueStr] = useState("");
  const discountValueFocused = useRef(false);
  const lastTypedDiscountValue = useRef(0);
  const [markupPct, setMarkupPct] = useState("");
  const markupSnapshot = useRef<number[] | null>(null);
  const [hasMarkupSnapshot, setHasMarkupSnapshot] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-simple"],
    queryFn: () => api.clients.list({ limit: "500" }) as Promise<any>,
    select: (data: any) => data?.data ?? (Array.isArray(data) ? data : []),
  });

  const { data: reformItems = [] } = useQuery({
    queryKey: ["reform-items-active"],
    queryFn: () => api.reformItems.list({ activeOnly: "true" }) as Promise<any>,
    select: (data: any) => data?.data ?? (Array.isArray(data) ? data : []),
  });

  const { data: reformPackages = [] } = useQuery({
    queryKey: ["reform-packages-active"],
    queryFn: () => api.reformPackages.list({ activeOnly: "true" }) as Promise<any>,
    select: (data: any) => data?.data ?? (Array.isArray(data) ? data : []),
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

  // Re-price items and packages when tier changes
  const repricedRef = useRef(false);
  useEffect(() => {
    if (repricedRef.current) {
      watchedItems.forEach((item: any, idx) => {
        if (item.reformItemId) {
          const reformItem = reformItems.find((r) => r.id === item.reformItemId);
          if (reformItem) {
            const newPrice = getPriceForTier(reformItem, watchedTier);
            setValue(`items.${idx}.unitPrice`, newPrice);
            setValue(`items.${idx}.subtotal`, newPrice * item.quantity);
          }
        } else if (item.reformPackageId) {
          const pkg = reformPackages.find((p) => p.id === item.reformPackageId);
          if (pkg) {
            const newPrice = getPriceForTier(pkg, watchedTier);
            setValue(`items.${idx}.unitPrice`, newPrice);
            setValue(`items.${idx}.subtotal`, newPrice * (item.quantity ?? 1));
          }
        }
      });
    }
    repricedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTier]);

  // Calculate totals
  const itemsTotal = watchedItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const extrasTotal = watchedExtras.reduce((s, e) => s + ((e.unitPrice ?? 0) * (e.quantity ?? 1)), 0);
  const subtotalBeforeDiscount = itemsTotal + extrasTotal;
  const discountAmount = subtotalBeforeDiscount * ((watchedDiscount ?? 0) / 100);
  const grandTotal = subtotalBeforeDiscount - discountAmount;

  const selectedItemIds = new Set(watchedItems.filter((i) => i.reformItemId).map((i) => i.reformItemId!));
  const selectedPackageIds = new Set(
    watchedItems
      .filter((i: any) => i.reformPackageId)
      .map((i: any) => i.reformPackageId as string)
  );

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
      } as any);
    },
    [watchedItems, watchedTier, appendItem, removeItem]
  );

  const handleSelectPackage = useCallback(
    (pkg: ReformPackage) => {
      const alreadyIdx = watchedItems.findIndex((i: any) => i.reformPackageId === pkg.id);
      if (alreadyIdx !== -1) {
        removeItem(alreadyIdx);
        return;
      }
      const total = getPriceForTier(pkg, watchedTier);
      appendItem({
        reformItemId: null,
        reformPackageId: pkg.id,
        name: pkg.name,
        quantity: 1,
        unitPrice: total,
        subtotal: total,
      } as any);
    },
    [watchedItems, watchedTier, appendItem, removeItem]
  );

  const handleCreateAndSelectItem = useCallback(
    async (formData: CreateItemForm) => {
      const res = await fetch("/api/v1/reform-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isActive: true, sortOrder: 0 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Erro ao criar item");

      queryClient.invalidateQueries({ queryKey: ["reform-items-active"] });

      const d = json.data;
      handleSelectItem({
        id: d.id,
        name: d.name,
        description: d.description ?? null,
        category: d.category,
        unit: d.unit,
        priceLow: parseFloat(d.priceLow),
        priceMedium: parseFloat(d.priceMedium),
        priceHigh: parseFloat(d.priceHigh),
        isActive: true,
      });
    },
    [queryClient, handleSelectItem]
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

  const applyExtraTemplate = (idx: number, t: { name: string; description?: string | null; unit: string; unitPrice: number }) => {
    const qty = watchedExtras[idx]?.quantity ?? 1;
    const opts = { shouldDirty: true };
    setValue(`extraItems.${idx}.name`, t.name, opts);
    setValue(`extraItems.${idx}.description` as any, t.description ?? "", opts);
    setValue(`extraItems.${idx}.unit` as any, t.unit, opts);
    setValue(`extraItems.${idx}.unitPrice`, t.unitPrice, opts);
    setValue(`extraItems.${idx}.subtotal`, qty * t.unitPrice, opts);
  };

  const addExtra = (room: string) => {
    appendExtra({ name: "", description: "", room, quantity: 1, unit: "UNIT", unitPrice: 0, subtotal: 0 } as any);
    setFocusExtraIdx(extraFields.length);
  };

  const handleAddRoom = () => {
    const name = newRoomName.trim();
    if (!name) return;
    addExtra(name);
    setNewRoomName("");
    setAddingRoom(false);
  };

  const handleAddItemToRoom = (roomName: string) => {
    addExtra(roomName);
  };

  const handleRenameRoom = (oldName: string, newName: string) => {
    watchedExtras.forEach((e: any, idx: number) => {
      if ((e?.room ?? "") === oldName) setValue(`extraItems.${idx}.room` as any, newName);
    });
    setEditingRoom(null);
  };

  const handleRemoveRoom = (roomName: string) => {
    extraFields
      .map((_, idx) => idx)
      .filter((idx) => (watchedExtras[idx] as any)?.room === roomName)
      .reverse()
      .forEach((idx) => removeExtra(idx));
  };

  const handleCopyRoom = (sourceRoom: string, targetRoom: string) => {
    const targetName = targetRoom.trim();
    if (!targetName) return;
    watchedExtras.forEach((e: any) => {
      if ((e?.room ?? "") === sourceRoom) {
        const qty = e.quantity ?? 1;
        const price = e.unitPrice ?? 0;
        appendExtra({ name: e.name ?? "", description: e.description ?? "", room: targetName, quantity: qty, unit: e.unit ?? "UNIT", unitPrice: price, subtotal: qty * price } as any);
      }
    });
    setCopyingRoom(null);
    setCopyTargetName("");
  };

  const handleApplyMarkup = () => {
    const pct = parseFloat(markupPct.replace(",", ".")) || 0;
    if (pct === 0) return;
    markupSnapshot.current = watchedExtras.map((e: any) => e?.unitPrice ?? 0);
    setHasMarkupSnapshot(true);
    const factor = 1 + pct / 100;
    watchedExtras.forEach((_: any, idx: number) => {
      const price = watchedExtras[idx]?.unitPrice ?? 0;
      const qty = watchedExtras[idx]?.quantity ?? 1;
      const newPrice = Math.round(price * factor * 100) / 100;
      setValue(`extraItems.${idx}.unitPrice`, newPrice, { shouldDirty: true });
      setValue(`extraItems.${idx}.subtotal`, newPrice * qty, { shouldDirty: true });
    });
    setMarkupPct("");
  };

  const handleUndoMarkup = () => {
    if (!markupSnapshot.current) return;
    markupSnapshot.current.forEach((originalPrice, idx) => {
      const qty = watchedExtras[idx]?.quantity ?? 1;
      setValue(`extraItems.${idx}.unitPrice`, originalPrice, { shouldDirty: true });
      setValue(`extraItems.${idx}.subtotal`, originalPrice * qty, { shouldDirty: true });
    });
    markupSnapshot.current = null;
    setHasMarkupSnapshot(false);
  };

  // Derive room groups from current extra items (preserves insertion order)
  const roomMap = new Map<string, number[]>();
  watchedExtras.forEach((e: any, idx: number) => {
    const room = e?.room ?? "";
    if (!roomMap.has(room)) roomMap.set(room, []);
    roomMap.get(room)!.push(idx);
  });
  const ungroupedIndices = roomMap.get("") ?? [];
  const namedRooms = [...roomMap.entries()].filter(([k]) => k !== "");

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
                inputMode="numeric"
                maxLength={9}
                {...register("zipCode", {
                  onChange: (e) => {
                    const masked = maskCep(e.target.value);
                    e.target.value = masked;
                    setValue("zipCode", masked);
                    lookupCep(masked);
                  },
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
                    const item = watchedItems[idx] as any;
                    const ri = getReformItemData(item.reformItemId);
                    const pkg = item.reformPackageId
                      ? reformPackages.find((p) => p.id === item.reformPackageId)
                      : null;
                    const displayName = pkg ? pkg.name : (ri?.name ?? item.name ?? "Item");
                    const isPackage = !!pkg;
                    return (
                      <tr key={field.id}>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            {isPackage && (
                              <LayoutGrid className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            )}
                            <p className="font-medium text-gray-900">{displayName}</p>
                          </div>
                          {isPackage && pkg?.items && pkg.items.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-5">
                              Inclui: {pkg.items.slice(0, 3).map((i: any) => i.name).join(", ")}
                              {pkg.items.length > 3 ? ` +${pkg.items.length - 3}` : ""}
                            </p>
                          )}
                          {!isPackage && ri?.description && (
                            <p className="text-xs text-gray-500">{ri.description}</p>
                          )}
                          {!isPackage && ri && (
                            <span className="text-xs text-gray-400">{CATEGORY_LABELS[ri.category]}</span>
                          )}
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
                          {!isPackage && ri && (
                            <span className="text-xs text-gray-400 ml-1">/{UNIT_LABELS[ri.unit]}</span>
                          )}
                          {isPackage && (
                            <span className="text-xs text-orange-400 ml-1">total</span>
                          )}
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
            <Button type="button" variant="outline" size="sm"
              onClick={() => { setAddingRoom(true); setNewRoomName(""); }}>
              <Plus className="h-4 w-4" /> Adicionar Ambiente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add room inline input */}
          {addingRoom && (
            <div className="flex gap-2 items-center p-3 bg-orange-50 rounded-lg border border-dashed border-orange-300">
              <input
                autoFocus
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Nome do ambiente (ex: Cozinha, Sala...)"
                className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddRoom(); }
                  if (e.key === "Escape") setAddingRoom(false);
                }}
              />
              <Button type="button" size="sm" onClick={handleAddRoom} disabled={!newRoomName.trim()}>Criar</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAddingRoom(false)}>Cancelar</Button>
            </div>
          )}

          {/* Empty state */}
          {extraFields.length === 0 && !addingRoom && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-gray-400">
                Nenhum item extra. Adicione ambientes (Cozinha, Sala...) ou itens avulsos.
              </p>
              <div className="flex gap-2 justify-center">
                <Button type="button" variant="outline" size="sm"
                  onClick={() => { setAddingRoom(true); setNewRoomName(""); }}>
                  <Plus className="h-4 w-4" /> Adicionar Ambiente
                </Button>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => addExtra("")}>
                  <Plus className="h-4 w-4" /> Item Avulso
                </Button>
              </div>
            </div>
          )}

          {/* Ungrouped items (no room) */}
          {ungroupedIndices.length > 0 && (
            <div className="space-y-3">
              {ungroupedIndices.map((idx) => {
                const extra = watchedExtras[idx];
                return (
                  <div key={extraFields[idx].id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ExtraItemAutocomplete
                          value={extra?.name ?? ""}
                          onChange={(v) => setValue(`extraItems.${idx}.name`, v)}
                          onSelect={(t) => applyExtraTemplate(idx, t)}
                          placeholder="Nome do item *"
                          autoFocus={focusExtraIdx === idx}
                          error={(errors.extraItems?.[idx] as any)?.name?.message}
                        />
                      </div>
                      <button type="button" onClick={() => removeExtra(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input {...register(`extraItems.${idx}.description`)} placeholder="Descrição (opcional)" />
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Qtd</label>
                        <input type="number" min="0.001" step="0.001" value={extra?.quantity ?? 1}
                          onChange={(e) => handleExtraChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Unid.</label>
                        <select {...register(`extraItems.${idx}.unit`)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Valor Unit.</label>
                        <input type="number" min="0" step="0.01" value={extra?.unitPrice ?? 0}
                          onChange={(e) => handleExtraChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
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

          {/* Named room sections */}
          {namedRooms.map(([roomName, indices]) => (
            <div key={roomName} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Room header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b border-gray-200">
                {editingRoom === roomName ? (
                  <>
                    <input autoFocus value={editedRoomName}
                      onChange={(e) => setEditedRoomName(e.target.value)}
                      className="flex-1 border border-orange-300 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
                      onBlur={() => { if (editedRoomName.trim()) handleRenameRoom(roomName, editedRoomName.trim()); else setEditingRoom(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); if (editedRoomName.trim()) handleRenameRoom(roomName, editedRoomName.trim()); else setEditingRoom(null); }
                        if (e.key === "Escape") setEditingRoom(null);
                      }} />
                    <span className="text-xs text-gray-400">Enter para confirmar</span>
                  </>
                ) : copyingRoom === roomName ? (
                  <>
                    <span className="text-xs text-gray-500 whitespace-nowrap">Copiar para:</span>
                    <input autoFocus value={copyTargetName}
                      onChange={(e) => setCopyTargetName(e.target.value)}
                      placeholder="Nome do novo ambiente"
                      className="flex-1 border border-orange-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCopyRoom(roomName, copyTargetName); }
                        if (e.key === "Escape") { setCopyingRoom(null); setCopyTargetName(""); }
                      }} />
                    <button type="button" onClick={() => handleCopyRoom(roomName, copyTargetName)}
                      disabled={!copyTargetName.trim()}
                      className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100 disabled:opacity-40">
                      Copiar
                    </button>
                    <button type="button" onClick={() => { setCopyingRoom(null); setCopyTargetName(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-gray-700">{roomName}</span>
                    <button type="button" title="Copiar ambiente"
                      onClick={() => { setCopyingRoom(roomName); setCopyTargetName(""); }}
                      className="text-gray-400 hover:text-orange-500 p-0.5">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Renomear ambiente"
                      onClick={() => { setEditingRoom(roomName); setEditedRoomName(roomName); }}
                      className="text-gray-400 hover:text-blue-500 p-0.5">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Remover ambiente e itens"
                      onClick={() => handleRemoveRoom(roomName)}
                      className="text-gray-400 hover:text-red-500 p-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              {/* Items in this room */}
              <div className="p-3 space-y-3">
                {indices.map((idx) => {
                  const extra = watchedExtras[idx];
                  return (
                    <div key={extraFields[idx].id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ExtraItemAutocomplete
                            value={extra?.name ?? ""}
                            onChange={(v) => setValue(`extraItems.${idx}.name`, v)}
                            onSelect={(t) => applyExtraTemplate(idx, t)}
                            placeholder="Nome do item *"
                            autoFocus={focusExtraIdx === idx}
                            error={(errors.extraItems?.[idx] as any)?.name?.message}
                          />
                        </div>
                        <button type="button" onClick={() => removeExtra(idx)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Input {...register(`extraItems.${idx}.description`)} placeholder="Descrição (opcional)" />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Qtd</label>
                          <input type="number" min="0.001" step="0.001" value={extra?.quantity ?? 1}
                            onChange={(e) => handleExtraChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Unid.</label>
                          <select {...register(`extraItems.${idx}.unit`)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Valor Unit.</label>
                          <input type="number" min="0" step="0.01" value={extra?.unitPrice ?? 0}
                            onChange={(e) => handleExtraChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
                <button type="button" onClick={() => handleAddItemToRoom(roomName)}
                  className="flex items-center gap-1.5 text-sm text-[#EA580C] hover:text-orange-700 font-medium mt-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar item neste ambiente
                </button>
              </div>
            </div>
          ))}

          {/* Bottom action buttons (when items already exist) */}
          {extraFields.length > 0 && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => addExtra("")}>
                <Plus className="h-4 w-4" /> Item avulso
              </Button>
              <Button type="button" variant="outline" size="sm"
                onClick={() => { setAddingRoom(true); setNewRoomName(""); }}>
                <Plus className="h-4 w-4" /> Novo Ambiente
              </Button>
            </div>
          )}

          {/* Subtotal footer */}
          {extraFields.length > 0 && (
            <div className="flex justify-end pt-3 border-t border-gray-200">
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
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-blue-700 font-medium whitespace-nowrap">Desconto</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                {...register("discount", { valueAsNumber: true })}
                className="w-20 h-8 px-2 rounded-md border border-blue-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                placeholder="0"
              />
              <span className="text-sm text-blue-600 font-medium">%</span>
            </div>
            <span className="text-sm text-blue-500">ou</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-blue-600 font-medium">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={discountValueStr}
                onFocus={() => { discountValueFocused.current = true; }}
                onBlur={() => {
                  discountValueFocused.current = false;
                  // Show the value the user typed (no recalculation to avoid float errors)
                  const v = lastTypedDiscountValue.current;
                  setDiscountValueStr(v > 0 ? v.toFixed(2).replace(".", ",") : "");
                }}
                onChange={(e) => {
                  const raw = e.target.value.replace(",", ".");
                  setDiscountValueStr(e.target.value);
                  const val = parseFloat(raw) || 0;
                  lastTypedDiscountValue.current = val;
                  // Store pct without rounding to avoid round-trip error
                  const pct = subtotalBeforeDiscount > 0 ? (val / subtotalBeforeDiscount) * 100 : 0;
                  setValue("discount", Math.min(pct, 100), { shouldDirty: true });
                }}
                className="w-28 h-8 px-2 rounded-md border border-blue-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                placeholder="0,00"
              />
            </div>
            {discountAmount > 0 && (
              <span className="text-sm text-green-700 font-medium ml-auto">
                − {formatCurrency(discountAmount)}
              </span>
            )}
          </div>
          {extraFields.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-blue-700 font-medium whitespace-nowrap">Reajuste itens extras</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={-100}
                  step="any"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyMarkup(); } }}
                  className="w-20 h-8 px-2 rounded-md border border-blue-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  placeholder="0"
                />
                <span className="text-sm text-blue-600 font-medium">%</span>
              </div>
              <button
                type="button"
                onClick={handleApplyMarkup}
                disabled={!markupPct || parseFloat(markupPct.replace(",", ".")) === 0}
                className="h-8 px-3 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
              {hasMarkupSnapshot && (
                <button
                  type="button"
                  onClick={handleUndoMarkup}
                  className="h-8 px-3 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Desfazer
                </button>
              )}
              {!hasMarkupSnapshot && <span className="text-xs text-blue-400">Aplica o percentual em todos os itens extras</span>}
            </div>
          )}
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
          reformPackages={reformPackages}
          selectedIds={selectedItemIds}
          selectedPackageIds={selectedPackageIds}
          tier={watchedTier}
          onSelect={handleSelectItem}
          onSelectPackage={handleSelectPackage}
          onClose={() => setShowItemSelector(false)}
          onCreateAndSelect={handleCreateAndSelectItem}
        />
      )}
    </form>
  );
}
