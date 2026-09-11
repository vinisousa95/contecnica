"use client";

import { useState, use, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, SPECIALTY_LABELS, SPECIALTY_COLORS } from "@/lib/utils";
import { formatCurrencyInput } from "@/lib/masks";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  ArrowLeft, Pencil, Plus, Trash2, Package, Wrench, DollarSign,
  Clock, CheckCircle2, XCircle, BarChart3, Phone, MapPin, Calendar, FileText,
  Upload, Loader2, X,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento", IN_PROGRESS: "Em Andamento", PAUSED: "Pausada",
  COMPLETED: "Concluída", CANCELLED: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700", COMPLETED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-500",
};
const EXP_STATUS: Record<string, string> = { PENDING: "Pendente", PAID: "Pago", OVERDUE: "Vencido" };
const EXP_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700", PAID: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700",
};
const PROV_STATUS: Record<string, string> = { PENDING: "Pendente", IN_PROGRESS: "Em Andamento", COMPLETED: "Concluído", CANCELED: "Cancelado" };
const PROV_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700", IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700", CANCELED: "bg-red-100 text-red-500",
};
const EXPENSE_CATEGORIES = [
  { value: "material", label: "Material" },
  { value: "mao_de_obra", label: "Mão de Obra" },
  { value: "transporte", label: "Transporte" },
  { value: "ferramentas", label: "Ferramentas" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "outros", label: "Outros" },
];
const PAYMENT_METHODS = ["PIX", "Dinheiro", "Cartão", "Transferência", "Boleto"];
const TABS = ["Resumo", "Materiais", "Prestadores", "Despesas", "Histórico"] as const;
type Tab = typeof TABS[number];

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

// ── Summary Cards ─────────────────────────────────────────────
function SummaryTab({ project }: { project: any }) {
  const s = project.summary ?? {};
  const cards = [
    { label: "Valor Previsto", value: s.budgeted ? formatCurrency(s.budgeted) : "—", color: "blue" },
    { label: "Total Materiais", value: formatCurrency(s.totalMaterials ?? 0), color: "amber" },
    { label: "Total Prestadores", value: formatCurrency(s.totalProviders ?? 0), color: "purple" },
    { label: "Total Despesas", value: formatCurrency(s.totalExpenses ?? 0), color: "orange" },
    { label: "Custo Total", value: formatCurrency(s.totalCost ?? 0), color: "red" },
    { label: "Saldo Restante", value: s.budgeted ? formatCurrency(s.balance ?? 0) : "—", color: (s.balance ?? 0) >= 0 ? "green" : "red", highlight: true },
  ];
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100",
    purple: "bg-purple-50 border-purple-100", orange: "bg-orange-50 border-orange-100",
    red: "bg-red-50 border-red-100", green: "bg-green-50 border-green-100",
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${colorMap[c.color]}`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.highlight && (s.balance ?? 0) < 0 ? "text-red-700" : c.highlight ? "text-green-700" : "text-gray-800"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {s.budgeted > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Uso do Orçamento</span>
              <span className={`font-semibold ${((s.totalCost / s.budgeted) * 100) > 100 ? "text-red-600" : "text-gray-700"}`}>
                {formatCurrency(s.totalCost)} / {formatCurrency(s.budgeted)} ({Math.round((s.totalCost / s.budgeted) * 100)}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${((s.totalCost / s.budgeted) * 100) > 100 ? "bg-red-500" : ((s.totalCost / s.budgeted) * 100) > 80 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, (s.totalCost / s.budgeted) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Informações da Obra</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {project.buyer && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Comprador</span>
              <span className="font-medium text-gray-800">{project.buyer.name}</span>
            </div>
          )}
          {project.buyer?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Telefone</span>
              <span className="text-gray-700">{project.buyer.phone}</span>
            </div>
          )}
          {project.address && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Endereço</span>
              <span className="text-gray-700">{project.address}</span>
            </div>
          )}
          {project.startDate && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Início</span>
              <span className="text-gray-700">{formatDate(project.startDate)}</span>
            </div>
          )}
          {project.expectedEndDate && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Previsão</span>
              <span className="text-gray-700">{formatDate(project.expectedEndDate)}</span>
            </div>
          )}
          {project.description && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Descrição</span>
              <span className="text-gray-700 whitespace-pre-wrap">{project.description}</span>
            </div>
          )}
          {project.notes && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">Observações</span>
              <span className="text-gray-700 whitespace-pre-wrap">{project.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Materials Tab ─────────────────────────────────────────────
function MateriaisTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const emptyForm = { description: "", supplier: "", quantity: "", unitPrice: "", date: "", paymentMethod: "", notes: "", attachmentUrl: "" };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingNota, setUploadingNota] = useState(false);
  const notaRef = useRef<HTMLInputElement>(null);

  // Nota fiscal do material. type=document → vai para uploads/documents. O
  // caminho fica no material; só sessão de admin abre o arquivo depois.
  const handleNota = async (file: File) => {
    setUploadingNota(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "document");
      const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro no upload");
      setForm((prev) => ({ ...prev, attachmentUrl: json.data.url }));
    } catch (e: any) {
      toast({ title: "Erro ao enviar nota", description: e.message, variant: "error" });
    } finally {
      setUploadingNota(false);
    }
  };

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["partnership-materials", projectId],
    queryFn: () => api.partnershipProjects.listMaterials(projectId) as Promise<any[]>,
  });

  const total = (materials as any[]).reduce((s: number, m: any) => s + Number(m.total), 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["partnership-materials", projectId] });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.partnershipProjects.updateMaterial(projectId, editId, form);
      } else {
        await api.partnershipProjects.createMaterial(projectId, form);
      }
      toast({ title: editId ? "Material atualizado" : "Material adicionado", variant: "success" });
      setForm(emptyForm); setEditId(null); setShowForm(false); refresh();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    } finally { setSaving(false); }
  };

  const handleEdit = (m: any) => {
    setForm({ description: m.description, supplier: m.supplier ?? "", quantity: String(m.quantity), unitPrice: m.unitPrice != null ? Number(m.unitPrice).toFixed(2) : "", date: m.date ? String(m.date).slice(0, 10) : "", paymentMethod: m.paymentMethod ?? "", notes: m.notes ?? "", attachmentUrl: m.attachmentUrl ?? "" });
    setEditId(m.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover este material?")) return;
    try {
      await api.partnershipProjects.deleteMaterial(projectId, id);
      toast({ title: "Removido", variant: "success" }); refresh();
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "error" }); }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Total: <span className="font-semibold text-gray-800">{formatCurrency(total)}</span></p>
        <Button size="sm" variant="outline" onClick={() => { setShowForm(v => !v); setEditId(null); setForm(emptyForm); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Adicionar Material
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
                  <input required value={form.description} onChange={f("description")} placeholder="Ex: Cimento CP-II 50kg" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor</label>
                  <input value={form.supplier} onChange={f("supplier")} placeholder="Nome do fornecedor" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                  <input type="date" value={form.date} onChange={f("date")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                  <input required type="number" step="0.001" min="0" value={form.quantity} onChange={f("quantity")} placeholder="0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <CurrencyInput
                    label="Valor Unitário (R$) *"
                    placeholder="0,00"
                    value={form.unitPrice}
                    onChange={(v) => setForm(prev => ({ ...prev, unitPrice: v }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
                  <select value={form.paymentMethod} onChange={f("paymentMethod")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                    <option value="">Selecionar...</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                  <div className="h-9 flex items-center px-3 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
                    {formatCurrency((parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nota fiscal</label>
                  <input ref={notaRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleNota(file); }} />
                  {form.attachmentUrl ? (
                    <div className="flex items-center gap-2 text-sm">
                      <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#EA580C] font-medium hover:underline">
                        <FileText className="h-3.5 w-3.5" />Ver nota anexada
                      </a>
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, attachmentUrl: "" }))}
                        title="Remover nota" className="text-gray-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => notaRef.current?.click()} disabled={uploadingNota}
                      className="flex items-center gap-1.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50">
                      {uploadingNota ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploadingNota ? "Enviando…" : "Anexar nota (PDF ou imagem)"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando…" : editId ? "Salvar" : "Adicionar"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="text-sm text-center py-6 text-gray-400">Carregando...</p> :
            (materials as any[]).length === 0 ? <p className="text-sm text-center py-8 text-gray-400">Nenhum material lançado.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(materials as any[]).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-sm">{m.description}</TableCell>
                      <TableCell className="text-sm text-gray-500">{m.supplier ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{m.date ? formatDate(m.date) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{Number(m.quantity).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(m.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(m.total)}</TableCell>
                      <TableCell>
                        {m.attachmentUrl ? (
                          <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#EA580C] hover:underline">
                            <FileText className="h-3 w-3" />Ver
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(m)} className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Providers Tab ─────────────────────────────────────────────
function PrestadoresTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const emptyForm = { serviceProviderId: "", serviceDescription: "", agreedAmount: "", paidAmount: "", dueDate: "", paymentDate: "", status: "PENDING", notes: "" };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: providers = [] } = useQuery({
    queryKey: ["partnership-providers", projectId],
    queryFn: () => api.partnershipProjects.listProviders(projectId) as Promise<any[]>,
  });
  const { data: spData } = useQuery({
    queryKey: ["service-providers-active"],
    queryFn: () => api.serviceProviders.list({ status: "ACTIVE", limit: "200" }) as Promise<any>,
    staleTime: 30000,
  });
  const serviceProviders: any[] = Array.isArray(spData) ? spData : (spData?.data ?? []);

  const totalAgreed = (providers as any[]).reduce((s: number, p: any) => s + Number(p.agreedAmount ?? 0), 0);
  const totalPaid = (providers as any[]).reduce((s: number, p: any) => s + Number(p.paidAmount ?? 0), 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["partnership-providers", projectId] });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, agreedAmount: form.agreedAmount || null, paidAmount: form.paidAmount || null, dueDate: form.dueDate || null, paymentDate: form.paymentDate || null };
      if (editId) {
        await api.partnershipProjects.updateProvider(projectId, editId, payload);
      } else {
        await api.partnershipProjects.createProvider(projectId, payload);
      }
      toast({ title: editId ? "Prestador atualizado" : "Prestador vinculado", variant: "success" });
      setForm(emptyForm); setEditId(null); setShowForm(false); refresh();
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "error" }); }
    finally { setSaving(false); }
  };

  const handleEdit = (p: any) => {
    setForm({ serviceProviderId: p.serviceProviderId, serviceDescription: p.serviceDescription, agreedAmount: p.agreedAmount != null ? Number(p.agreedAmount).toFixed(2) : "", paidAmount: p.paidAmount != null ? Number(p.paidAmount).toFixed(2) : "", dueDate: p.dueDate ? String(p.dueDate).slice(0, 10) : "", paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : "", status: p.status, notes: p.notes ?? "" });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover este prestador?")) return;
    try { await api.partnershipProjects.deleteProvider(projectId, id); toast({ title: "Removido", variant: "success" }); refresh(); }
    catch (e: any) { toast({ title: "Erro", description: e.message, variant: "error" }); }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 space-x-4">
          <span>Combinado: <span className="font-semibold text-gray-800">{formatCurrency(totalAgreed)}</span></span>
          <span>Pago: <span className="font-semibold text-green-700">{formatCurrency(totalPaid)}</span></span>
          <span>Saldo: <span className="font-semibold text-amber-700">{formatCurrency(totalAgreed - totalPaid)}</span></span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setShowForm(v => !v); setEditId(null); setForm(emptyForm); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Vincular Prestador
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prestador *</label>
                  <select required value={form.serviceProviderId} onChange={f("serviceProviderId")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                    <option value="">Selecionar...</option>
                    {serviceProviders.map((sp: any) => <option key={sp.id} value={sp.id}>{sp.name} — {SPECIALTY_LABELS[sp.specialty] ?? sp.specialty}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do Serviço *</label>
                  <input required value={form.serviceDescription} onChange={f("serviceDescription")} placeholder="Ex: Instalação elétrica" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <CurrencyInput
                    label="Valor Combinado (R$)"
                    placeholder="0,00"
                    value={form.agreedAmount}
                    onChange={(v) => setForm(prev => ({ ...prev, agreedAmount: v }))}
                  />
                </div>
                <div>
                  <CurrencyInput
                    label="Valor Pago (R$)"
                    placeholder="0,00"
                    value={form.paidAmount}
                    onChange={(v) => setForm(prev => ({ ...prev, paidAmount: v }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vencimento</label>
                  <input type="date" value={form.dueDate} onChange={f("dueDate")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de Pagamento</label>
                  <input type="date" value={form.paymentDate} onChange={f("paymentDate")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={f("status")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                    <option value="PENDING">Pendente</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                  <input value={form.notes} onChange={f("notes")} placeholder="Observações..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando…" : editId ? "Salvar" : "Vincular"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {(providers as any[]).length === 0 ? <p className="text-sm text-center py-8 text-gray-400">Nenhum prestador vinculado.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Combinado</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers as any[]).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{p.serviceProvider?.name}</p>
                      {p.serviceProvider?.specialty && (
                        <span className={`inline-flex text-xs rounded-full px-1.5 py-0.5 ${SPECIALTY_COLORS[p.serviceProvider.specialty] ?? "bg-gray-100 text-gray-600"}`}>
                          {SPECIALTY_LABELS[p.serviceProvider.specialty]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[150px] truncate">{p.serviceDescription}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{p.agreedAmount ? formatCurrency(p.agreedAmount) : "—"}</TableCell>
                    <TableCell className="text-right text-sm text-green-700 font-medium">{p.paidAmount ? formatCurrency(p.paidAmount) : "—"}</TableCell>
                    <TableCell className="text-right text-sm text-amber-700 font-medium">
                      {p.agreedAmount ? formatCurrency(Number(p.agreedAmount) - Number(p.paidAmount ?? 0)) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PROV_STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {PROV_STATUS[p.status] ?? p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(p)} className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────
function DespesasTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const emptyForm = { description: "", category: "outros", amount: "", date: "", paymentMethod: "", status: "PENDING", notes: "" };

  // Funcionários ativos, para a categoria "Mão de Obra" oferecer a lista em vez
  // de exigir digitar o nome. Só ativos: escalar quem saiu não faz sentido.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => (await api.employees.list({ status: "ACTIVE", limit: "200" })).data ?? [],
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["partnership-expenses", projectId],
    queryFn: () => api.partnershipProjects.listExpenses(projectId) as Promise<any[]>,
  });

  const total = (expenses as any[]).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const refresh = () => qc.invalidateQueries({ queryKey: ["partnership-expenses", projectId] });

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, amount: form.amount || "0", date: form.date || null };
      if (editId) await api.partnershipProjects.updateExpense(projectId, editId, payload);
      else await api.partnershipProjects.createExpense(projectId, payload);
      toast({ title: editId ? "Despesa atualizada" : "Despesa lançada", variant: "success" });
      setForm(emptyForm); setEditId(null); setShowForm(false); refresh();
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "error" }); }
    finally { setSaving(false); }
  };

  const handleEdit = (e: any) => {
    setForm({ description: e.description, category: e.category, amount: e.amount != null ? Number(e.amount).toFixed(2) : "", date: e.date ? String(e.date).slice(0, 10) : "", paymentMethod: e.paymentMethod ?? "", status: e.status, notes: e.notes ?? "" });
    setEditId(e.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover esta despesa?")) return;
    try { await api.partnershipProjects.deleteExpense(projectId, id); toast({ title: "Removida", variant: "success" }); refresh(); }
    catch (e: any) { toast({ title: "Erro", description: e.message, variant: "error" }); }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Total: <span className="font-semibold text-gray-800">{formatCurrency(total)}</span></p>
        <Button size="sm" variant="outline" onClick={() => { setShowForm(v => !v); setEditId(null); setForm(emptyForm); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Lançar Despesa
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {form.category === "mao_de_obra" && (
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Funcionário</label>
                  <select
                    value={(employees as any[]).find((emp: any) => emp.name === form.description)?.id ?? ""}
                    onChange={(e) => {
                      const emp = (employees as any[]).find((x: any) => x.id === e.target.value);
                      // Preenche a descrição — o campo segue editável para
                      // acrescentar contexto ("Diária 03/08", por exemplo).
                      setForm((prev) => ({ ...prev, description: emp ? emp.name : "" }));
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">Selecionar funcionário...</option>
                    {(employees as any[]).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{emp.role ? ` — ${emp.role}` : ""}
                      </option>
                    ))}
                  </select>
                  {(employees as any[]).length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Nenhum funcionário ativo cadastrado.
                    </p>
                  )}
                </div>
              )}

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
                <input required value={form.description} onChange={f("description")} placeholder={form.category === "mao_de_obra" ? "Nome do funcionário ou detalhe do pagamento" : "Ex: Aluguel de andaime"} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select value={form.category} onChange={f("category")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <CurrencyInput
                  label="Valor (R$) *"
                  required
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(v) => setForm(prev => ({ ...prev, amount: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input type="date" value={form.date} onChange={f("date")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
                <select value={form.paymentMethod} onChange={f("paymentMethod")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                  <option value="">Selecionar...</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={f("status")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Vencido</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando…" : editId ? "Salvar" : "Lançar"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {(expenses as any[]).length === 0 ? <p className="text-sm text-center py-8 text-gray-400">Nenhuma despesa lançada.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expenses as any[]).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.description}</TableCell>
                    <TableCell className="text-sm text-gray-500 capitalize">{EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}</TableCell>
                    <TableCell className="text-sm text-gray-500">{e.date ? formatDate(e.date) : "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EXP_STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {EXP_STATUS[e.status] ?? e.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(e)} className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────
function HistoricoTab({ project }: { project: any }) {
  const allItems = [
    ...(project.materials ?? []).map((m: any) => ({ date: m.createdAt, type: "Material", icon: Package, color: "bg-amber-100 text-amber-700", label: `${m.description} — ${formatCurrency(m.total)}` })),
    ...(project.partnerExpenses ?? []).map((e: any) => ({ date: e.createdAt, type: "Despesa", icon: DollarSign, color: "bg-red-100 text-red-700", label: `${e.description} — ${formatCurrency(e.amount)}` })),
    ...(project.partnerProviders ?? []).map((p: any) => ({ date: p.createdAt, type: "Prestador", icon: Wrench, color: "bg-blue-100 text-blue-700", label: `${p.serviceProvider?.name} — ${p.serviceDescription}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allItems.length === 0) return <p className="text-sm text-center py-8 text-gray-400">Nenhuma atividade registrada ainda.</p>;

  return (
    <div className="space-y-3">
      {allItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">{item.label}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(item.date)}</span>
              </div>
              <span className={`inline-flex text-xs rounded-full px-2 py-0.5 mt-0.5 ${item.color}`}>{item.type}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ObraParceriaDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [activeTab, setActiveTab] = useState<Tab>("Resumo");

  const { data: project, isLoading } = useQuery({
    queryKey: ["partnership-project", params.id],
    queryFn: () => api.partnershipProjects.get(params.id) as Promise<any>,
  });

  if (isLoading) return <LoadingPage />;
  if (!project) return null;

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={project.name}
        description={`Comprador: ${project.buyer?.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/obras-parcerias"><ArrowLeft className="h-4 w-4" />Voltar</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/obras-parcerias/${params.id}/relatorio`} target="_blank">
                <FileText className="h-4 w-4" />Relatório
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/obras-parcerias/${params.id}/editar`}><Pencil className="h-4 w-4" />Editar</Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
        {project.address && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4" />{project.address}</span>}
        {project.startDate && <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-4 w-4" />Início: {formatDate(project.startDate)}</span>}
        {project.expectedEndDate && <span className="text-sm text-gray-500">Previsão: {formatDate(project.expectedEndDate)}</span>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-[#EA580C] text-[#EA580C]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === "Resumo" && <SummaryTab project={project} />}
        {activeTab === "Materiais" && <MateriaisTab projectId={params.id} />}
        {activeTab === "Prestadores" && <PrestadoresTab projectId={params.id} />}
        {activeTab === "Despesas" && <DespesasTab projectId={params.id} />}
        {activeTab === "Histórico" && <HistoricoTab project={project} />}
      </div>
    </div>
  );
}
