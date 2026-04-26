"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, Eye } from "lucide-react";

const UNIT_OPTIONS = [
  { value: "UNIT", label: "Un" },
  { value: "SQM", label: "m²" },
  { value: "M", label: "m" },
  { value: "ML", label: "ml" },
  { value: "DAILY", label: "Diária" },
  { value: "SERVICE", label: "Serviço" },
  { value: "POINT", label: "Ponto" },
  { value: "HOUR", label: "Hora" },
];

const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml", DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

interface ServiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

interface Installment {
  installment: number;
  dueDate: string;
  amount: number;
  description: string;
}

function replaceVars(body: string, vars: Record<string, string>): string {
  let result = body;
  for (const [k, v] of Object.entries(vars)) {
    result = result.split(`{{${k}}}`).join(v || `{{${k}}}`);
  }
  return result;
}

function buildServiceItemsText(items: ServiceItem[]): string {
  if (!items.length) return "— (sem itens) —";
  return items
    .map((i, idx) => `${idx + 1}. ${i.name} — ${i.quantity} ${UNIT_LABELS[i.unit] ?? i.unit} × ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.subtotal)}`)
    .join("\n");
}

function buildParcelasText(items: Installment[]): string {
  if (!items.length) return "— (sem parcelas) —";
  return items
    .map((i) => `${i.installment}ª ${i.description || "parcela"}: ${formatCurrency(i.amount)} — vencimento ${i.dueDate}`)
    .join("\n");
}

export default function NovoContratoPage() {
  const router = useRouter();

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => api.contractTemplates.list() as Promise<any[]>,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => api.clients.list({ status: "ACTIVE", limit: "200" }) as Promise<any>,
  });

  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("Contrato de Prestação de Serviços");
  const [templateBody, setTemplateBody] = useState("");
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
    { name: "", quantity: 1, unit: "SERVICE", unitPrice: 0, subtotal: 0 },
  ]);
  const [installments, setInstallments] = useState<Installment[]>([
    { installment: 1, dueDate: "", amount: 0, description: "Entrada" },
  ]);
  const [vars, setVars] = useState<Record<string, string>>({
    cidade: "",
    data_assinatura: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    prazo_dias: "",
    data_inicio: "",
    valor_total_extenso: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  const clientList = Array.isArray(clients) ? clients : (clients as any)?.data ?? [];

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-contract", clientId],
    queryFn: () =>
      clientId
        ? (api.projects.list({ clientId, limit: "100" }) as Promise<any>)
        : Promise.resolve([]),
    enabled: !!clientId,
  });

  const projectList = Array.isArray(projects) ? projects : (projects as any)?.data ?? [];

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.companySettings.get() as Promise<any>,
  });

  const selectedClient = clientList.find((c: any) => c.id === clientId);
  const selectedProject = projectList.find((p: any) => p.id === projectId);

  // Fetch linked budget when project changes
  const { data: projectDetail } = useQuery({
    queryKey: ["project-detail-contract", projectId],
    queryFn: () => api.projects.get(projectId) as Promise<any>,
    enabled: !!projectId,
  });

  const linkedBudgetId = projectDetail?.linkedBudgetId ?? null;

  const { data: linkedBudget } = useQuery({
    queryKey: ["budget-for-contract", linkedBudgetId],
    queryFn: () => api.budgets.get(linkedBudgetId!) as Promise<any>,
    enabled: !!linkedBudgetId,
  });

  // Auto-populate service items from linked budget
  useEffect(() => {
    if (!linkedBudget) return;

    const items: ServiceItem[] = [];

    // Regular budget items (from catalog)
    for (const item of linkedBudget.items ?? []) {
      const name = item.name || item.reformItem?.name || item.reformPackage?.name || "Serviço";
      items.push({
        name,
        quantity: Number(item.quantity),
        unit: item.reformItem?.unit ?? item.reformPackage?.unit ?? "SERVICE",
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      });
    }

    // Extra items (free-form)
    for (const item of linkedBudget.extraItems ?? []) {
      items.push({
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? "SERVICE",
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      });
    }

    if (items.length > 0) {
      setServiceItems(items);
      toast({ title: `${items.length} item(s) importados do orçamento vinculado`, variant: "success" });
    }
  }, [linkedBudget]);

  useEffect(() => {
    if (templateId) {
      const tpl = templates.find((t: any) => t.id === templateId);
      if (tpl) setTemplateBody(tpl.body);
    }
  }, [templateId, templates]);

  const totalAmount = serviceItems.reduce((s, i) => s + (i.subtotal || 0), 0);

  const buildVars = useCallback((): Record<string, string> => {
    const company = companySettings as any;
    const clientAddr = selectedClient
      ? [selectedClient.street, selectedClient.number, selectedClient.neighborhood, selectedClient.city, selectedClient.state].filter(Boolean).join(", ")
      : "";
    const projectAddr = selectedProject
      ? [selectedProject.street, selectedProject.number, selectedProject.neighborhood, selectedProject.city, selectedProject.state].filter(Boolean).join(", ")
      : "";

    return {
      empresa_nome: company?.name ?? "",
      empresa_cnpj: company?.cnpj ?? "",
      empresa_endereco: [company?.street, company?.number, company?.neighborhood, company?.city, company?.state].filter(Boolean).join(", "),
      cliente_nome: selectedClient?.name ?? "",
      cliente_cnpj: selectedClient?.document ?? "",
      cliente_endereco: clientAddr,
      obra_endereco: projectAddr,
      obra_descricao: selectedProject?.description ?? "",
      valor_total: formatCurrency(totalAmount),
      itens_servico: buildServiceItemsText(serviceItems),
      parcelas: buildParcelasText(installments),
      ...vars,
    };
  }, [companySettings, selectedClient, selectedProject, totalAmount, serviceItems, installments, vars]);

  const previewBody = templateBody ? replaceVars(templateBody, buildVars()) : "";

  function updateItem(idx: number, field: keyof ServiceItem, value: any) {
    setServiceItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        next[idx].subtotal = Number(next[idx].quantity) * Number(next[idx].unitPrice);
      }
      if (field === "subtotal") next[idx].subtotal = Number(value);
      return next;
    });
  }

  function addItem() {
    setServiceItems((prev) => [...prev, { name: "", quantity: 1, unit: "SERVICE", unitPrice: 0, subtotal: 0 }]);
  }

  function removeItem(idx: number) {
    setServiceItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateInstallment(idx: number, field: keyof Installment, value: any) {
    setInstallments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { installment: prev.length + 1, dueDate: "", amount: 0, description: "" },
    ]);
  }

  function removeInstallment(idx: number) {
    setInstallments((prev) =>
      prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, installment: i + 1 }))
    );
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => api.contracts.create(data),
    onSuccess: (res: any) => {
      toast({ title: "Contrato criado!", variant: "success" });
      router.push(`/contratos/${res.id}`);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  function handleSubmit() {
    if (!clientId) return toast({ title: "Selecione o cliente", variant: "error" });
    if (!templateBody) return toast({ title: "Selecione um modelo de contrato", variant: "error" });

    const allVars = buildVars();
    const finalBody = replaceVars(templateBody, allVars);

    createMutation.mutateAsync({
      templateId: templateId || null,
      clientId,
      projectId: projectId || null,
      title,
      body: finalBody,
      serviceItems,
      paymentSchedule: installments,
      variables: vars,
      totalAmount,
    }).catch(() => {});
  }

  const templateOptions = [
    { value: "", label: "Selecione um modelo..." },
    ...templates.map((t: any) => ({ value: t.id, label: t.name })),
  ];

  const clientOptions = [
    { value: "", label: "Selecione o cliente..." },
    ...clientList.map((c: any) => ({ value: c.id, label: c.name })),
  ];

  const projectOptions = [
    { value: "", label: "Sem obra vinculada" },
    ...projectList.map((p: any) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Novo Contrato"
        description="Preencha os dados e itens do contrato"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/contratos")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4" />
              {showPreview ? "Ocultar Prévia" : "Pré-visualizar"}
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              Salvar Contrato
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          {/* Dados básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Título do Contrato"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Modelo de Contrato</label>
                  <Select
                    options={templateOptions}
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                  <Select
                    options={clientOptions}
                    value={clientId}
                    onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
                setServiceItems([{ name: "", quantity: 1, unit: "SERVICE", unitPrice: 0, subtotal: 0 }]);
              }}
                  />
                </div>
              </div>
              {clientId && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Obra Vinculada</label>
                  <Select
                    options={projectOptions}
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itens de Serviço */}
          <Card>
            <CardHeader>
              <CardTitle>Itens de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">Descrição</th>
                      <th className="pb-2 font-medium w-20">Qtd</th>
                      <th className="pb-2 font-medium w-24">Un</th>
                      <th className="pb-2 font-medium w-28">Valor Unit.</th>
                      <th className="pb-2 font-medium w-28 text-right">Subtotal</th>
                      <th className="pb-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {serviceItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2">
                          <input
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            placeholder="Descrição do serviço"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                            value={item.quantity}
                            min={0}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                            value={item.unit}
                            onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          >
                            {UNIT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                            value={item.unitPrice}
                            min={0}
                            step={0.01}
                            onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-medium text-gray-700">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="pt-3 text-right text-sm font-semibold text-gray-700">Total:</td>
                      <td className="pt-3 text-right font-bold text-[#EA580C]">{formatCurrency(totalAmount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Parcelas */}
          <Card>
            <CardHeader>
              <CardTitle>Condições de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {installments.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-8">{inst.installment}ª</span>
                    <input
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      placeholder="Descrição (ex: Entrada)"
                      value={inst.description}
                      onChange={(e) => updateInstallment(idx, "description", e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-32 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      placeholder="Valor"
                      value={inst.amount}
                      min={0}
                      step={0.01}
                      onChange={(e) => updateInstallment(idx, "amount", Number(e.target.value))}
                    />
                    <input
                      type="date"
                      className="w-36 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      value={inst.dueDate}
                      onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                    />
                    <button
                      onClick={() => removeInstallment(idx)}
                      className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addInstallment}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar Parcela
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Painel de variáveis */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Variáveis do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-400">
                Dados do cliente e empresa são preenchidos automaticamente. Preencha abaixo as demais variáveis.
              </p>
              {selectedClient && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-gray-700">Cliente detectado</p>
                  <p className="text-gray-500">{selectedClient.name}</p>
                  {selectedClient.document && <p className="text-gray-400">CPF/CNPJ: {selectedClient.document}</p>}
                </div>
              )}
              {selectedProject && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-gray-700">Obra vinculada</p>
                  <p className="text-gray-500">{selectedProject.name}</p>
                </div>
              )}
              <Input
                label="Cidade de assinatura"
                value={vars.cidade}
                onChange={(e) => setVars((v) => ({ ...v, cidade: e.target.value }))}
                placeholder="ex: São Paulo"
              />
              <Input
                label="Data de assinatura"
                value={vars.data_assinatura}
                onChange={(e) => setVars((v) => ({ ...v, data_assinatura: e.target.value }))}
                placeholder="ex: 26 de abril de 2026"
              />
              <Input
                label="Data de início"
                value={vars.data_inicio}
                onChange={(e) => setVars((v) => ({ ...v, data_inicio: e.target.value }))}
                placeholder="ex: 01 de maio de 2026"
              />
              <Input
                label="Prazo (dias)"
                value={vars.prazo_dias}
                onChange={(e) => setVars((v) => ({ ...v, prazo_dias: e.target.value }))}
                placeholder="ex: 90"
              />
              <Input
                label="Valor total por extenso"
                value={vars.valor_total_extenso}
                onChange={(e) => setVars((v) => ({ ...v, valor_total_extenso: e.target.value }))}
                placeholder="ex: cinco mil reais"
              />
              <Input
                label="Nome do responsável"
                value={vars.responsavel_nome}
                onChange={(e) => setVars((v) => ({ ...v, responsavel_nome: e.target.value }))}
                placeholder="Nome completo"
              />
              <Input
                label="CPF do responsável"
                value={vars.responsavel_cpf}
                onChange={(e) => setVars((v) => ({ ...v, responsavel_cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prévia */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              {previewBody || "Selecione um modelo para visualizar..."}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
