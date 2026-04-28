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
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Plus, UserX, Pencil, Trash2, X, Check } from "lucide-react";

const REASON_OPTIONS = [
  { value: "", label: "Todos os motivos" },
  { value: "Falta injustificada", label: "Falta injustificada" },
  { value: "Atestado médico", label: "Atestado médico" },
  { value: "Problema familiar", label: "Problema familiar" },
  { value: "Falta justificada", label: "Falta justificada" },
  { value: "Outro", label: "Outro" },
];

const REASON_FORM_OPTIONS = [
  "Falta injustificada",
  "Atestado médico",
  "Problema familiar",
  "Falta justificada",
  "Outro",
];

const emptyForm = {
  employeeId: "",
  date: "",
  reason: "",
  notes: "",
  justified: false,
};

export default function FaltasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ["absences"],
    queryFn: async () => {
      const res = await fetch("/api/v1/absences");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees?status=ACTIVE&limit=200");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const employees: any[] = employeesData ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = editingId ? `/api/v1/absences/${editingId}` : "/api/v1/absences";
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
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast({ title: editingId ? "Falta atualizada!" : "Falta registrada!", variant: "success" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/absences/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast({ title: "Falta excluída", variant: "success" });
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

  function handleEdit(absence: any) {
    setForm({
      employeeId: absence.employeeId,
      date: String(absence.date).slice(0, 10),
      reason: absence.reason,
      notes: absence.notes ?? "",
      justified: absence.justified,
    });
    setEditingId(absence.id);
    setShowForm(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.employeeId) e.employeeId = "Funcionário obrigatório";
    if (!form.date) e.date = "Data obrigatória";
    if (!form.reason) e.reason = "Motivo obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(form);
  }

  const filtered = (absences as any[]).filter((a) => {
    if (filterEmployee && !a.employee?.name.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
    if (filterReason && a.reason !== filterReason) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faltas de Funcionários"
        description="Registre e acompanhe as faltas da equipe"
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Registrar Falta
          </Button>
        }
      />

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">
                {editingId ? "Editar Registro" : "Nova Falta"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Funcionário *</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                    disabled={!!editingId}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C] disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Selecionar funcionário…</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{emp.role ? ` — ${emp.role}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
                </div>

                <Input
                  label="Data *"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  error={errors.date}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">Selecionar motivo…</option>
                    {REASON_FORM_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
                </div>

                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.justified}
                      onChange={(e) => setForm((f) => ({ ...f, justified: e.target.checked }))}
                      className="rounded w-4 h-4 accent-[#EA580C]"
                    />
                    Falta justificada
                  </label>
                </div>
              </div>

              <Input
                label="Observações"
                placeholder="Detalhes adicionais sobre a falta..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />

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
        <div className="flex-1">
          <Input
            placeholder="Buscar por funcionário..."
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
          />
        </div>
        <Select
          className="w-52 shrink-0"
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
          options={REASON_OPTIONS}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <UserX className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma falta registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Justificada</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{a.employee?.name}</p>
                      {a.employee?.role && (
                        <p className="text-xs text-gray-400">{a.employee.role}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{a.reason}</TableCell>
                    <TableCell>
                      {a.justified ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                          <Check className="h-3 w-3" /> Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600">
                          Não
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-400 max-w-[200px] truncate">
                      {a.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(a)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(a.id)}>
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
        title="Excluir registro de falta"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
