"use client";

import { useState, useEffect, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Wrench, Droplets, Pencil, Trash2, X, Check, Store } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { parseCurrencyInput } from "@/lib/masks";
import { CurrencyInput } from "@/components/ui/currency-input";

const MAINTENANCE_TYPES = [
  "Troca de Óleo",
  "Troca de Filtro",
  "Troca de Pneu",
  "Freios",
  "Suspensão",
  "Revisão Geral",
  "Elétrica",
  "Funilaria / Pintura",
  "Outro",
];

type MaintenanceRecord = {
  id: string;
  date: string;
  type: string;
  description?: string | null;
  km?: number | null;
  cost?: number | null;
  workshop?: string | null;
  notes?: string | null;
};

type FormState = {
  date: string;
  type: string;
  description: string;
  km: string;
  costStr: string;
  workshop: string;
  notes: string;
};

function emptyForm(): FormState {
  return { date: "", type: MAINTENANCE_TYPES[0], description: "", km: "", costStr: "", workshop: "", notes: "" };
}

export default function ManutencaoVeiculoPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  // Oil change settings
  const [oilForm, setOilForm] = useState<{
    currentKm: string;
    lastOilChangeDate: string;
    lastOilChangeKm: string;
    oilChangeIntervalKm: string;
    oilChangeIntervalDays: string;
  } | null>(null);

  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ["vehicle", params.id],
    queryFn: () => api.vehicles.get(params.id) as Promise<any>,
  });

  useEffect(() => {
    if (vehicle && !oilForm) {
      setOilForm({
        currentKm: vehicle.currentKm != null ? String(vehicle.currentKm) : "",
        lastOilChangeDate: vehicle.lastOilChangeDate ? String(vehicle.lastOilChangeDate).slice(0, 10) : "",
        lastOilChangeKm: vehicle.lastOilChangeKm != null ? String(vehicle.lastOilChangeKm) : "",
        oilChangeIntervalKm: vehicle.oilChangeIntervalKm != null ? String(vehicle.oilChangeIntervalKm) : "",
        oilChangeIntervalDays: vehicle.oilChangeIntervalDays != null ? String(vehicle.oilChangeIntervalDays) : "",
      });
    }
  }, [vehicle]);

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["vehicle-maintenance", params.id],
    queryFn: () => api.vehicles.listMaintenance(params.id) as Promise<MaintenanceRecord[]>,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.vehicles.createMaintenance(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", params.id] });
      toast({ title: "Registro adicionado!", variant: "success" });
      setShowForm(false);
      setForm(emptyForm());
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.vehicles.updateMaintenance(params.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", params.id] });
      toast({ title: "Registro atualizado!", variant: "success" });
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.deleteMaintenance(params.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", params.id] });
      toast({ title: "Registro excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const oilMutation = useMutation({
    mutationFn: (data: any) => api.vehicles.update(params.id, { ...vehicle, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", params.id] });
      toast({ title: "Configurações salvas!", variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  function buildPayload(f: FormState) {
    const costRaw = parseCurrencyInput(f.costStr);
    return {
      date: f.date,
      type: f.type,
      description: f.description || null,
      km: f.km ? parseInt(f.km) : null,
      cost: costRaw ? Number(costRaw) : null,
      workshop: f.workshop || null,
      notes: f.notes || null,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.type) {
      toast({ title: "Preencha data e tipo", variant: "error" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: buildPayload(form) });
    } else {
      createMutation.mutate(buildPayload(form));
    }
  }

  function startEdit(r: MaintenanceRecord) {
    setEditingId(r.id);
    setShowForm(true);
    setForm({
      date: r.date ? String(r.date).slice(0, 10) : "",
      type: r.type,
      description: r.description ?? "",
      km: r.km != null ? String(r.km) : "",
      costStr: r.cost != null ? Number(r.cost).toFixed(2) : "",
      workshop: r.workshop ?? "",
      notes: r.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function saveOilSettings() {
    if (!oilForm) return;
    oilMutation.mutate({
      currentKm: oilForm.currentKm ? parseInt(oilForm.currentKm) : null,
      lastOilChangeDate: oilForm.lastOilChangeDate || null,
      lastOilChangeKm: oilForm.lastOilChangeKm ? parseInt(oilForm.lastOilChangeKm) : null,
      oilChangeIntervalKm: oilForm.oilChangeIntervalKm ? parseInt(oilForm.oilChangeIntervalKm) : null,
      oilChangeIntervalDays: oilForm.oilChangeIntervalDays ? parseInt(oilForm.oilChangeIntervalDays) : null,
    });
  }

  if (loadingVehicle) return <LoadingPage />;
  if (!vehicle) return null;

  const maintenanceRecords = Array.isArray(records) ? records : (records as any)?.data ?? [];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={`Manutenção — ${vehicle.name}`}
        description={[vehicle.model, vehicle.plate].filter(Boolean).join(" · ") || "Veículo"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/operacional/veiculos/${params.id}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {!showForm && (
              <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}>
                <Plus className="h-4 w-4" />
                Novo Registro
              </Button>
            )}
          </div>
        }
      />

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              {editingId ? "Editar Registro" : "Novo Registro de Manutenção"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Data"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
                <Select
                  label="Tipo de Manutenção"
                  required
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  options={MAINTENANCE_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </div>

              <Input
                label="Descrição"
                placeholder="O que foi feito?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="KM no momento"
                  type="number"
                  placeholder="Ex: 85000"
                  min={0}
                  value={form.km}
                  onChange={(e) => setForm((p) => ({ ...p, km: e.target.value }))}
                />
                <CurrencyInput
                  label="Custo (R$)"
                  placeholder="0,00"
                  value={form.costStr}
                  onChange={(v) => setForm((p) => ({ ...p, costStr: v }))}
                />
              </div>

              <Input
                label="Oficina / Estabelecimento"
                placeholder="Nome da oficina ou local do serviço"
                value={form.workshop}
                onChange={(e) => setForm((p) => ({ ...p, workshop: e.target.value }))}
              />

              <Textarea
                label="Observações"
                placeholder="Informações adicionais..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cancelForm}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  {editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Maintenance History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-400" />
            Histórico de Manutenção ({maintenanceRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecords ? (
            <LoadingPage />
          ) : maintenanceRecords.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Wrench className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum registro de manutenção</p>
              <p className="text-xs text-gray-300 mt-1">Clique em "Novo Registro" para adicionar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {maintenanceRecords.map((r: MaintenanceRecord) => (
                <div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50/80">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                        {r.type}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {formatDate(r.date)}
                      </span>
                      {r.km != null && (
                        <span className="text-xs text-gray-400">{r.km.toLocaleString("pt-BR")} km</span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                    )}
                    {r.workshop && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Store className="h-3 w-3" />{r.workshop}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">{r.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {r.cost != null && (
                      <span className="text-sm font-medium text-gray-700">{formatCurrency(r.cost)}</span>
                    )}
                    <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => startEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-400 hover:text-red-600"
                      title="Excluir"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Oil Change Settings ── */}
      {oilForm && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Droplets className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">Alerta de Troca de Óleo</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="KM Atual"
                type="number"
                placeholder="Ex: 85000"
                min={0}
                value={oilForm.currentKm}
                onChange={(e) => setOilForm((p) => p && ({ ...p, currentKm: e.target.value }))}
              />
              <Input
                label="Data da Última Troca"
                type="date"
                value={oilForm.lastOilChangeDate}
                onChange={(e) => setOilForm((p) => p && ({ ...p, lastOilChangeDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="KM da Última Troca"
                type="number"
                placeholder="Ex: 80000"
                min={0}
                value={oilForm.lastOilChangeKm}
                onChange={(e) => setOilForm((p) => p && ({ ...p, lastOilChangeKm: e.target.value }))}
              />
              <Input
                label="Intervalo (KM)"
                type="number"
                placeholder="Ex: 5000"
                min={0}
                value={oilForm.oilChangeIntervalKm}
                onChange={(e) => setOilForm((p) => p && ({ ...p, oilChangeIntervalKm: e.target.value }))}
              />
              <Input
                label="Intervalo (Dias)"
                type="number"
                placeholder="Ex: 180"
                min={0}
                value={oilForm.oilChangeIntervalDays}
                onChange={(e) => setOilForm((p) => p && ({ ...p, oilChangeIntervalDays: e.target.value }))}
              />
            </div>

            <p className="text-xs text-gray-400">
              Preencha os intervalos em KM e/ou dias para receber alertas de próxima troca de óleo.
            </p>

            <div className="flex justify-end">
              <Button size="sm" onClick={saveOilSettings} loading={oilMutation.isPending}>
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir registro"
        description="Tem certeza que deseja excluir este registro de manutenção?"
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
