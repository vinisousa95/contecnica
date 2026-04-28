"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
  REVENUE_STATUS_LABELS,
  REVENUE_STATUS_COLORS,
  SPECIALTY_LABELS,
  SPECIALTY_COLORS,
  WORK_PROVIDER_STATUS_LABELS,
  WORK_PROVIDER_STATUS_COLORS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Pencil, MapPin, Calendar, DollarSign,
  ArrowDownCircle, ArrowUpCircle, Plus, CheckCircle2,
  Circle, Eye, EyeOff, Trash2, Link2, ListChecks, RefreshCw, Wrench, Users, Car, HardHat,
} from "lucide-react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

// ── Equipe Section ────────────────────────────────────────────
const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-500",
};

function EquipeSection({ projectId }: { projectId: string }) {
  const today = new Date().toISOString().split("T")[0];
  const [filterDate, setFilterDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", projectId, filterDate],
    queryFn: () =>
      apiFetch(`/api/v1/assignments?projectId=${projectId}&limit=100&from=${filterDate}&to=${filterDate}`),
  });

  const assignments: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-[#EA580C]" />
            Equipe na Obra ({assignments.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
            />
            <Button size="sm" asChild>
              <Link href={`/operacional/novo?projectId=${projectId}`}>
                <Plus className="h-4 w-4" />
                Agendar
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Carregando...</p>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-200" />
            Nenhum deslocamento agendado para esta obra.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>RG</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{a.employee?.name}</p>
                    {a.employee?.role && <p className="text-xs text-gray-400">{a.employee.role}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{a.employee?.rg ?? "—"}</TableCell>
                  <TableCell>
                    {a.vehicle ? (
                      <div className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{a.vehicle.name}</span>
                        {a.vehicle.plate && <span className="text-xs text-gray-400">· {a.vehicle.plate}</span>}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {a.date ? formatDate(a.date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{a.departureTime ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSIGNMENT_STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Execução Section ─────────────────────────────────────────
function ExecucaoSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: linkData, isLoading: loadingLink } = useQuery({
    queryKey: ["project-link-budget", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/link-budget`),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/tasks`),
  });

  const budgets: any[] = linkData?.budgets ?? [];
  const linkedBudgetId: string | null = linkData?.linkedBudgetId ?? null;

  const importBudget = async () => {
    if (!selectedBudgetId) return;
    setImporting(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ importBudgetId: selectedBudgetId }),
      });
      toast({ title: "Itens importados do orçamento" });
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["project-link-budget", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  const updateTask = async (taskId: string, data: object) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast({ title: "Item removido" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const addManualTask = async () => {
    const name = window.prompt("Nome do item:");
    if (!name?.trim()) return;
    try {
      await apiFetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), order: tasks.length }),
      });
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-[#EA580C]" />
            Execução da Obra
            <span className="text-xs font-normal text-gray-400 ml-1">({tasks.length} itens)</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Import from budget */}
            {budgets.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedBudgetId}
                  onChange={(e) => setSelectedBudgetId(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                >
                  <option value="">Selecionar orçamento aprovado…</option>
                  {budgets.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.title}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedBudgetId || importing}
                  onClick={importBudget}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${importing ? "animate-spin" : ""}`} />
                  Importar
                </Button>
              </div>
            )}
            {budgets.length === 0 && !loadingLink && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                Nenhum orçamento aprovado para este cliente
              </p>
            )}
            <Button size="sm" variant="outline" onClick={addManualTask}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Item manual
            </Button>
          </div>
        </div>
        {linkedBudgetId && (
          <p className="text-xs text-[#EA580C] mt-1 flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            Orçamento vinculado · {budgets.find((b: any) => b.id === linkedBudgetId)?.title ?? linkedBudgetId}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loadingTasks ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando…</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 space-y-2">
            <ListChecks className="h-8 w-8 mx-auto text-gray-200" />
            <p>Nenhum item de execução ainda.</p>
            <p className="text-xs">Importe um orçamento aprovado ou adicione itens manualmente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto_auto_auto] gap-3 px-5 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Item</span>
              <span>Início</span>
              <span>Conclusão</span>
              <span>Portal</span>
              <span>Feito</span>
              <span></span>
            </div>
            {tasks.map((task: any) => (
              <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: any;
  onUpdate: (id: string, data: object) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className={`grid grid-cols-[2fr_1fr_1fr_auto_auto_auto] gap-3 items-center px-5 py-3 ${task.isCompleted ? "bg-green-50/40" : ""}`}>
      {/* Name */}
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${task.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}>
          {task.name}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 truncate">{task.description}</p>
        )}
      </div>

      {/* Start date */}
      <input
        type="date"
        defaultValue={task.startDate ? task.startDate.slice(0, 10) : ""}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#EA580C] w-full"
        onBlur={(e) => onUpdate(task.id, { startDate: e.target.value || null })}
      />

      {/* End date */}
      <input
        type="date"
        defaultValue={task.endDate ? task.endDate.slice(0, 10) : ""}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#EA580C] w-full"
        onBlur={(e) => onUpdate(task.id, { endDate: e.target.value || null })}
      />

      {/* Portal visibility */}
      <button
        onClick={() => onUpdate(task.id, { showInPortal: !task.showInPortal })}
        title={task.showInPortal ? "Visível no portal" : "Oculto no portal"}
        className={`p-1.5 rounded-lg transition-colors ${task.showInPortal ? "text-[#EA580C] bg-orange-50" : "text-gray-300 hover:bg-gray-50"}`}
      >
        {task.showInPortal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>

      {/* Completed toggle */}
      <button
        onClick={() => onUpdate(task.id, { isCompleted: !task.isCompleted })}
        title={task.isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
        className={`p-1.5 rounded-lg transition-colors ${task.isCompleted ? "text-green-600 bg-green-50" : "text-gray-300 hover:bg-gray-50"}`}
      >
        {task.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Extra Services Section ────────────────────────────────────
function extraServiceLabel(s: any) {
  if (s.status === "REJECTED") return "Recusado";
  if (s.status === "PENDING_APPROVAL") return "Aguardando cliente";
  if (s.paidAt) return "Pago";
  return "Aguardando pagamento";
}

function extraServiceColor(s: any) {
  if (s.status === "REJECTED") return "bg-red-100 text-red-700";
  if (s.status === "PENDING_APPROVAL") return "bg-amber-100 text-amber-700";
  if (s.paidAt) return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}

function ExtraServicesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRequestedBy, setFormRequestedBy] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["project-extra-services", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/extra-services`),
  });

  const { data: reformItems = [] } = useQuery({
    queryKey: ["reform-items-all"],
    queryFn: () => apiFetch(`/api/v1/reform-items?activeOnly=true&limit=500`),
    staleTime: 60000,
  });

  const filteredItems = (reformItems as any[]).filter((item: any) =>
    !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase())
  ).slice(0, 8);

  const selectItem = (item: any) => {
    setFormName(item.name);
    setFormDescription(item.description ?? "");
    setFormAmount(item.priceMedium ? String(item.priceMedium) : "");
    setItemSearch(item.name);
    setShowSuggestions(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAmount.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/extra-services`, {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          requestedBy: formRequestedBy.trim() || null,
          amount: formAmount.trim(),
        }),
      });
      toast({ title: "Serviço extra adicionado" });
      qc.invalidateQueries({ queryKey: ["project-extra-services", projectId] });
      setFormName("");
      setFormDescription("");
      setFormRequestedBy("");
      setFormAmount("");
      setItemSearch("");
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm("Remover este serviço extra?")) return;
    try {
      await apiFetch(`/api/v1/projects/${projectId}/extra-services/${serviceId}`, {
        method: "DELETE",
      });
      toast({ title: "Serviço removido" });
      qc.invalidateQueries({ queryKey: ["project-extra-services", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const handleMarkPaid = async (serviceId: string, paid: boolean) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/extra-services/${serviceId}`, {
        method: "PUT",
        body: JSON.stringify({ markPaid: paid }),
      });
      toast({ title: paid ? "Marcado como pago" : "Pagamento desmarcado" });
      qc.invalidateQueries({ queryKey: ["project-extra-services", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#EA580C]" />
            Serviços Extras
            <span className="text-xs font-normal text-gray-400 ml-1">({services.length} {services.length === 1 ? "serviço" : "serviços"})</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar Serviço Extra
          </Button>
        </div>
      </CardHeader>

      {showForm && (
        <div className="px-5 pb-4 border-b border-gray-100">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Serviço *</label>
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setFormName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Buscar ou digitar nome..."
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
              {showSuggestions && filteredItems.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredItems.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => selectItem(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex justify-between items-center gap-2"
                    >
                      <span className="font-medium text-gray-800 truncate">{item.name}</span>
                      {item.priceMedium && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatCurrency(item.priceMedium)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Opcional"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1">Solicitante</label>
              <input
                type="text"
                value={formRequestedBy}
                onChange={(e) => setFormRequestedBy(e.target.value)}
                placeholder="Nome (opcional)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0,00"
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setItemSearch(""); }}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando…</p>
        ) : services.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 space-y-2">
            <Wrench className="h-8 w-8 mx-auto text-gray-200" />
            <p>Nenhum serviço extra adicionado.</p>
            <p className="text-xs">Adicione serviços extras que precisam de aprovação do cliente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 px-5 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Serviço</span>
              <span>Valor</span>
              <span>Status</span>
              <span></span>
              <span></span>
            </div>
            {services.map((s: any) => (
              <div key={s.id} className="grid grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-center px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-gray-400 truncate">{s.description}</p>
                  )}
                  {s.requestedBy && (
                    <p className="text-xs text-gray-400 truncate">Solicitante: {s.requestedBy}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.amount)}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${extraServiceColor(s)}`}>
                  {extraServiceLabel(s)}
                </span>
                {s.status === "ACCEPTED" && !s.paidAt && (
                  <button
                    onClick={() => handleMarkPaid(s.id, true)}
                    title="Marcar como pago"
                    className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    Marcar pago
                  </button>
                )}
                {s.status === "ACCEPTED" && s.paidAt && (
                  <button
                    onClick={() => handleMarkPaid(s.id, false)}
                    title="Desfazer pagamento"
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors whitespace-nowrap"
                  >
                    Desfazer
                  </button>
                )}
                {s.status !== "ACCEPTED" && <span />}
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={s.status === "ACCEPTED"}
                  title={s.status === "ACCEPTED" ? "Serviço aceito não pode ser removido" : "Remover"}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-300 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Prestadores Section ───────────────────────────────────────
function PrestadoresSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceProviderId: "",
    serviceDescription: "",
    agreedAmount: "",
    startDate: "",
    expectedEndDate: "",
    generateExpense: false,
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["project-service-providers", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/service-providers`),
  });

  const { data: providersData } = useQuery({
    queryKey: ["service-providers-active"],
    queryFn: () => apiFetch(`/api/v1/service-providers?status=ACTIVE&limit=200`),
    staleTime: 30000,
  });
  const providers: any[] = Array.isArray(providersData) ? providersData : (providersData?.data ?? []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceProviderId || !form.serviceDescription.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/service-providers`, {
        method: "POST",
        body: JSON.stringify({
          serviceProviderId: form.serviceProviderId,
          serviceDescription: form.serviceDescription.trim(),
          ...(form.agreedAmount ? { agreedAmount: form.agreedAmount } : {}),
          ...(form.startDate ? { startDate: form.startDate } : {}),
          ...(form.expectedEndDate ? { expectedEndDate: form.expectedEndDate } : {}),
          generateExpense: form.generateExpense,
          projectId,
        }),
      });
      toast({ title: "Prestador vinculado à obra" });
      qc.invalidateQueries({ queryKey: ["project-service-providers", projectId] });
      setForm({ serviceProviderId: "", serviceDescription: "", agreedAmount: "", startDate: "", expectedEndDate: "", generateExpense: false });
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    if (!window.confirm("Remover este prestador da obra?")) return;
    try {
      await apiFetch(`/api/v1/projects/${projectId}/service-providers/${linkId}`, { method: "DELETE" });
      toast({ title: "Prestador removido da obra" });
      qc.invalidateQueries({ queryKey: ["project-service-providers", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const handleStatusChange = async (linkId: string, status: string) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/service-providers/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      qc.invalidateQueries({ queryKey: ["project-service-providers", projectId] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardHat className="h-4 w-4 text-[#EA580C]" />
            Prestadores de Serviço
            <span className="text-xs font-normal text-gray-400 ml-1">({(links as any[]).length})</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Vincular Prestador
          </Button>
        </div>
      </CardHeader>

      {showForm && (
        <div className="px-5 pb-4 border-b border-gray-100">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prestador *</label>
                <select
                  value={form.serviceProviderId}
                  onChange={(e) => setForm((f) => ({ ...f, serviceProviderId: e.target.value }))}
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                >
                  <option value="">Selecionar prestador…</option>
                  {providers.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {SPECIALTY_LABELS[p.specialty] ?? p.specialty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do Serviço *</label>
                <input
                  type="text"
                  value={form.serviceDescription}
                  onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))}
                  placeholder="Ex: Instalação elétrica completa"
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Combinado (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.agreedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, agreedAmount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Início</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Previsão</label>
                  <input
                    type="date"
                    value={form.expectedEndDate}
                    onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>
              </div>
            </div>
            {form.agreedAmount && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.generateExpense}
                  onChange={(e) => setForm((f) => ({ ...f, generateExpense: e.target.checked }))}
                  className="rounded"
                />
                Gerar despesa automática no financeiro
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Salvando…" : "Vincular"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando…</p>
        ) : (links as any[]).length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 space-y-2">
            <HardHat className="h-8 w-8 mx-auto text-gray-200" />
            <p>Nenhum prestador vinculado a esta obra.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prestador</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(links as any[]).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/prestadores/${l.serviceProviderId}`} className="font-medium text-sm hover:text-blue-600">
                      {l.serviceProvider?.name}
                    </Link>
                    {l.serviceProvider?.specialty && (
                      <p>
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${SPECIALTY_COLORS[l.serviceProvider.specialty]}`}>
                          {SPECIALTY_LABELS[l.serviceProvider.specialty]}
                        </span>
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[180px] truncate">{l.serviceDescription}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.agreedAmount ? formatCurrency(l.agreedAmount) : "—"}
                  </TableCell>
                  <TableCell>
                    <select
                      value={l.status}
                      onChange={(e) => handleStatusChange(l.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${WORK_PROVIDER_STATUS_COLORS[l.status]}`}
                    >
                      {Object.entries(WORK_PROVIDER_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    {l.expense ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_STATUS_COLORS[l.expense.status]}`}>
                        {EXPENSE_STATUS_LABELS[l.expense.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleRemove(l.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => api.projects.get(params.id) as Promise<any>,
  });

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deleteRevenueId, setDeleteRevenueId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [deletingRevenue, setDeletingRevenue] = useState(false);

  const handleDeleteExpense = async () => {
    if (!deleteExpenseId) return;
    setDeletingExpense(true);
    try {
      await api.expenses.delete(deleteExpenseId);
      queryClient.invalidateQueries({ queryKey: ["project", params.id] });
      toast({ title: "Despesa excluída", variant: "success" });
      setDeleteExpenseId(null);
    } catch {
      toast({ title: "Erro ao excluir despesa", variant: "error" });
    } finally {
      setDeletingExpense(false);
    }
  };

  const handleDeleteRevenue = async () => {
    if (!deleteRevenueId) return;
    setDeletingRevenue(true);
    try {
      await api.revenues.delete(deleteRevenueId);
      queryClient.invalidateQueries({ queryKey: ["project", params.id] });
      toast({ title: "Receita excluída", variant: "success" });
      setDeleteRevenueId(null);
    } catch {
      toast({ title: "Erro ao excluir receita", variant: "error" });
    } finally {
      setDeletingRevenue(false);
    }
  };

  if (isLoading) return <LoadingPage />;
  if (!project) return null;

  const { financialSummary: fs } = project;

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={project.name}
        description={`Cliente: ${project.client?.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/obras">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/obras/${params.id}/portal`}>
                Portal do Cliente
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/obras/${params.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status + info */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
        {project.startDate && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Início: {formatDate(project.startDate)}
          </span>
        )}
        {project.expectedEndDate && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Previsão: {formatDate(project.expectedEndDate)}
          </span>
        )}
        {project.city && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {project.city}/{project.state}
          </span>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinCard label="Orçamento" value={fs.budget ? formatCurrency(fs.budget) : "—"} sub={fs.budget && fs.budgetUsed ? `${fs.budgetUsed.toFixed(0)}% usado` : undefined} color="blue" />
        <FinCard label="Custo total" value={formatCurrency(fs.totalExpenses)} sub={`${formatCurrency(fs.paidExpenses)} pago`} color="amber" />
        <FinCard label="Receita total" value={formatCurrency(fs.totalRevenues)} sub={`${formatCurrency(fs.receivedRevenues)} recebido`} color="green" />
        <FinCard label="Margem" value={formatCurrency(fs.margin)} positive={fs.margin >= 0} color={fs.margin >= 0 ? "green" : "red"} />
      </div>

      {/* Budget bar */}
      {fs.budget && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Uso do Orçamento</span>
              <span className={`font-semibold ${(fs.budgetUsed ?? 0) > 100 ? "text-red-600" : (fs.budgetUsed ?? 0) > 80 ? "text-amber-600" : "text-gray-700"}`}>
                {formatCurrency(fs.totalExpenses)} / {formatCurrency(fs.budget)} ({fs.budgetUsed?.toFixed(0) ?? 0}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${(fs.budgetUsed ?? 0) > 100 ? "bg-red-500" : (fs.budgetUsed ?? 0) > 80 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, fs.budgetUsed ?? 0)}%` }}
              />
            </div>
            {fs.budgetVariance != null && (
              <p className={`text-xs mt-1 ${fs.budgetVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fs.budgetVariance >= 0
                  ? `${formatCurrency(fs.budgetVariance)} abaixo do orçamento`
                  : `${formatCurrency(Math.abs(fs.budgetVariance))} acima do orçamento`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipe na Obra */}
      <EquipeSection projectId={params.id} />

      {/* Execução da Obra */}
      <ExecucaoSection projectId={params.id} />

      {/* Serviços Extras */}
      <ExtraServicesSection projectId={params.id} />

      {/* Prestadores */}
      <PrestadoresSection projectId={params.id} />

      {/* Expenses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              Despesas ({project.expenses?.length ?? 0})
            </CardTitle>
            <Button size="sm" asChild>
              <Link href={`/financeiro/despesas/nova?obraId=${params.id}`}>
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {project.expenses?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma despesa lançada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.expenses?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.description}</TableCell>
                    <TableCell className="text-sm text-gray-500">{e.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(e.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_STATUS_COLORS[e.status]}`}>
                        {EXPENSE_STATUS_LABELS[e.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/financeiro/despesas/${e.id}/editar`}>
                          <Button variant="ghost" size="icon-sm" title="Editar">
                            <Pencil className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteExpenseId(e.id)}>
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

      {/* Revenues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              Receitas ({project.revenues?.length ?? 0})
            </CardTitle>
            <Button size="sm" asChild>
              <Link href={`/financeiro/receitas/nova?obraId=${params.id}`}>
                <Plus className="h-4 w-4" />
                Nova Receita
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {project.revenues?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma receita lançada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.revenues?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.description}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(r.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold text-sm text-green-700">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REVENUE_STATUS_COLORS[r.status]}`}>
                        {REVENUE_STATUS_LABELS[r.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/financeiro/receitas/${r.id}/editar`}>
                          <Button variant="ghost" size="icon-sm" title="Editar">
                            <Pencil className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteRevenueId(r.id)}>
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

      {project.description && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Descrição</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteExpenseId}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title="Excluir despesa"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deletingExpense}
        onConfirm={handleDeleteExpense}
      />
      <ConfirmDialog
        open={!!deleteRevenueId}
        onOpenChange={(open) => !open && setDeleteRevenueId(null)}
        title="Excluir receita"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deletingRevenue}
        onConfirm={handleDeleteRevenue}
      />
    </div>
  );
}

function FinCard({ label, value, sub, color, positive }: { label: string; value: string; sub?: string; color: "blue" | "amber" | "green" | "red"; positive?: boolean }) {
  const colorMap = { blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100", green: "bg-green-50 border-green-100", red: "bg-red-50 border-red-100" };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${positive === false ? "text-red-700" : positive === true ? "text-green-700" : "text-gray-800"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
