"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, AlertTriangle, Pencil, Trash2, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Paga" },
  { value: "CONTESTED", label: "Contestada" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-green-50 text-green-700",
  CONTESTED: "bg-blue-50 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Paga",
  CONTESTED: "Contestada",
};

const REASON_OPTIONS = [
  "Excesso de velocidade",
  "Avanço de sinal",
  "Estacionamento irregular",
  "Uso de celular ao volante",
  "Ultrapassagem indevida",
  "Falta de cinto de segurança",
  "Veículo sem documentação",
  "Outra",
];

const emptyForm = {
  vehicleId: "",
  employeeId: "",
  assignmentId: "",
  date: "",
  amount: "",
  reason: "",
  points: "",
  status: "PENDING",
  notes: "",
};

export default function MultasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ["fines"],
    queryFn: async () => {
      const res = await fetch("/api/v1/fines");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-active"],
    queryFn: async () => {
      const res = await fetch("/api/v1/vehicles?status=ACTIVE&limit=100");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees?limit=200");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["assignments-for-fines", form.vehicleId],
    enabled: !!form.vehicleId,
    queryFn: async () => {
      const res = await fetch(`/api/v1/assignments?vehicleId=${form.vehicleId}&limit=100`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const vehicles: any[] = vehiclesData ?? [];
  const employees: any[] = employeesData ?? [];
  const assignments: any[] = assignmentsData ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = editingId ? `/api/v1/fines/${editingId}` : "/api/v1/fines";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      toast({ title: editingId ? "Multa atualizada!" : "Multa registrada!", variant: "success" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/fines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      toast({ title: "Multa excluída", variant: "success" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "error" }),
  });

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  }

  function handleEdit(fine: any) {
    setForm({
      vehicleId: fine.vehicleId,
      employeeId: fine.employeeId ?? "",
      assignmentId: fine.assignmentId ?? "",
      date: String(fine.date).slice(0, 10),
      amount: String(fine.amount),
      reason: fine.reason,
      points: fine.points ? String(fine.points) : "",
      status: fine.status,
      notes: fine.notes ?? "",
    });
    setEditingId(fine.id);
    setShowForm(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.vehicleId) e.vehicleId = "Veículo obrigatório";
    if (!form.date) e.date = "Data obrigatória";
    if (!form.reason) e.reason = "Motivo obrigatório";
    if (!form.amount) e.amount = "Valor obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(form);
  }

  const filtered = (fines as any[]).filter((f) => {
    if (filterVehicle && f.vehicleId !== filterVehicle) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    return true;
  });

  const totalPending = (fines as any[])
    .filter((f) => f.status === "PENDING")
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Multas de Veículos"
        description="Controle as multas da frota operacional"
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Registrar Multa
          </Button>
        }
      />

      {totalPending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{(fines as any[]).filter((f) => f.status === "PENDING").length} multa(s) pendente(s)</strong>
            {" — "}total de <strong>{formatCurrency(totalPending)}</strong>
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">
                {editingId ? "Editar Multa" : "Nova Multa"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Veículo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Veículo *</label>
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value, assignmentId: "" }))}
                    disabled={!!editingId}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C] disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Selecionar veículo…</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}{v.plate ? ` — ${v.plate}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.vehicleId && <p className="text-xs text-red-500 mt-1">{errors.vehicleId}</p>}
                </div>

                {/* Data */}
                <Input
                  label="Data da Multa *"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  error={errors.date}
                />
              </div>

              {/* Funcionário responsável */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Funcionário responsável <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                >
                  <option value="">Nenhum funcionário específico</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}{emp.role ? ` — ${emp.role}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deslocamento vinculado */}
              {form.vehicleId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Deslocamento vinculado <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={form.assignmentId}
                    onChange={(e) => setForm((f) => ({ ...f, assignmentId: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">Nenhum deslocamento específico</option>
                    {assignments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.date)} — {a.employee?.name} → {a.project?.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">Selecionar motivo…</option>
                    {REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
                </div>

                <CurrencyInput
                  label="Valor (R$) *"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  error={errors.amount}
                />

                <Input
                  label="Pontos na CNH"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="Ex: 5"
                  value={form.points}
                  onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  options={[
                    { value: "PENDING", label: "Pendente" },
                    { value: "PAID", label: "Paga" },
                    { value: "CONTESTED", label: "Contestada" },
                  ]}
                />
                <Input
                  label="Observações"
                  placeholder="Detalhes adicionais..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" size="sm" loading={saveMutation.isPending}>
                  {editingId ? "Salvar Alterações" : "Registrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-row items-center gap-3">
        <Select
          className="w-56 shrink-0"
          value={filterVehicle}
          onChange={(e) => setFilterVehicle(e.target.value)}
          options={[
            { value: "", label: "Todos os veículos" },
            ...vehicles.map((v: any) => ({ value: v.id, label: v.plate ? `${v.name} — ${v.plate}` : v.name })),
          ]}
        />
        <Select
          className="w-44 shrink-0"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma multa registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Deslocamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{f.vehicle?.name}</p>
                      {f.vehicle?.plate && (
                        <p className="text-xs text-gray-400 font-mono">{f.vehicle.plate}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(f.date)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {f.employee?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{f.reason}</TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {f.assignment ? (
                        <span>
                          {formatDate(f.assignment.date)}<br />
                          <span className="text-xs">{f.assignment.employee?.name}</span>
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatCurrency(Number(f.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {f.points ? `${f.points} pts` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                        {STATUS_LABELS[f.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(f)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(f.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
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
        title="Excluir multa"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
