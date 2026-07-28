"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { numberToWordsBRL } from "@/lib/masks";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { LoadingPage } from "@/components/ui/loading";

const UNIT_OPTIONS = [
  { value: "UNIT", label: "Un" }, { value: "SQM", label: "m²" }, { value: "M", label: "m" },
  { value: "ML", label: "ml" }, { value: "DAILY", label: "Diária" }, { value: "SERVICE", label: "Serviço" },
  { value: "POINT", label: "Ponto" }, { value: "HOUR", label: "Hora" },
];
const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml", DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

const MONTHS_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function formatDateLong(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} de ${MONTHS_PT[parseInt(m) - 1]} de ${y}`;
}

function DateVarInput({ label, varKey, vars, setVars }: { label: string; varKey: string; vars: Record<string, string>; setVars: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const [dateVal, setDateVal] = useState("");
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input type="date" value={dateVal}
          onChange={(e) => { setDateVal(e.target.value); setVars((v) => ({ ...v, [varKey]: formatDateLong(e.target.value) })); }}
          className="w-40 border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
        <input type="text" value={vars[varKey] ?? ""}
          onChange={(e) => setVars((v) => ({ ...v, [varKey]: e.target.value }))}
          placeholder="ou digite manualmente"
          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
      </div>
    </div>
  );
}

interface ServiceItem { name: string; quantity: number; unit: string; unitPrice: number; subtotal: number; }
interface Installment { installment: number; dueDate: string; amount: number; amountStr: string; description: string; }

function replaceVars(body: string, vars: Record<string, string>): string {
  let r = body;
  for (const [k, v] of Object.entries(vars)) r = r.split(`{{${k}}}`).join(v || `{{${k}}}`);
  return r;
}

export default function EditarContratoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => api.contracts.get(id) as Promise<any>,
    enabled: !!id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => api.contractTemplates.list() as Promise<any[]>,
  });

  const [title, setTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [discountAmountFixed, setDiscountAmountFixed] = useState<number | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({
    cidade: "", data_assinatura: "", responsavel_nome: "", responsavel_cpf: "",
    prazo_dias: "", data_inicio: "", valor_total_extenso: "",
  });
  const [loaded, setLoaded] = useState(false);

  // Pre-populate from existing contract
  useEffect(() => {
    if (!contract || loaded) return;
    setTitle(contract.title ?? "");
    setTemplateId(contract.template?.id ?? "");
    setTemplateBody(contract.body ?? "");
    setServiceItems(Array.isArray(contract.serviceItems) ? contract.serviceItems.map((i: any) => ({
      name: i.name, quantity: Number(i.quantity), unit: i.unit ?? "SERVICE",
      unitPrice: Number(i.unitPrice), subtotal: Number(i.subtotal),
    })) : []);
    setInstallments(Array.isArray(contract.paymentSchedule) ? contract.paymentSchedule.map((p: any, i: number) => ({
      installment: p.installment ?? i + 1, dueDate: p.dueDate ?? "", amount: Number(p.amount),
      amountStr: Number(p.amount) > 0 ? Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
      description: p.description ?? "",
    })) : []);
    if (typeof contract.variables === "object") setVars((v) => ({ ...v, ...contract.variables }));
    setLoaded(true);
  }, [contract, loaded]);

  const grossTotal = serviceItems.reduce((s, i) => s + (i.subtotal || 0), 0);
  const discountAmount = discountAmountFixed ?? 0;
  const discount = grossTotal > 0 ? (discountAmount / grossTotal) * 100 : 0;
  const totalAmount = Math.round((grossTotal - discountAmount) * 100) / 100;

  useEffect(() => {
    if (totalAmount > 0) setVars((v) => ({ ...v, valor_total_extenso: numberToWordsBRL(totalAmount) }));
  }, [totalAmount]);

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.companySettings.get() as Promise<any>,
  });

  const buildVars = useCallback((): Record<string, string> => {
    const company = companySettings as any;
    const client = contract?.client;
    return {
      empresa_nome: company?.name ?? "", empresa_cnpj: company?.cnpj ?? "",
      cliente_nome: client?.name ?? "", cliente_cnpj: client?.document ?? "",
      valor_bruto: formatCurrency(grossTotal),
      desconto_pct: discount > 0 ? `${discount.toFixed(2)}%` : "0%",
      desconto_valor: discount > 0 ? formatCurrency(discountAmount) : "R$ 0,00",
      valor_total: formatCurrency(totalAmount),
      ...vars,
    };
  }, [companySettings, contract, grossTotal, discount, discountAmount, totalAmount, vars]);

  function updateItem(idx: number, field: keyof ServiceItem, value: any) {
    setServiceItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice")
        next[idx].subtotal = Number(next[idx].quantity) * Number(next[idx].unitPrice);
      return next;
    });
  }

  function updateInstallment(idx: number, field: keyof Installment, value: any) {
    setInstallments((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.contracts.update(id, data),
    onSuccess: () => {
      toast({ title: "Contrato atualizado!", variant: "success" });
      router.push(`/contratos/${id}`);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  function handleSubmit() {
    const allVars = buildVars();
    const finalBody = replaceVars(templateBody, allVars);
    // amountStr é só de interface — ver comentário na tela de novo contrato.
    const paymentSchedule = installments.map(({ amountStr, ...rest }) => rest);

    updateMutation.mutateAsync({
      title, body: finalBody, serviceItems, paymentSchedule, variables: vars, totalAmount,
    }).catch(() => {});
  }

  if (isLoading || !loaded) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Editar Contrato"
        description={`${contract?.number} · ${contract?.client?.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleSubmit} loading={updateMutation.isPending}>
              Salvar Alterações
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          {/* Title */}
          <Card>
            <CardContent className="pt-4">
              <Input label="Título do contrato" value={title} onChange={(e) => setTitle(e.target.value)} />
            </CardContent>
          </Card>

          {/* Template */}
          {templates.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Modelo de Contrato</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <select value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    const tpl = (templates as any[]).find((t) => t.id === e.target.value);
                    if (tpl) setTemplateBody(tpl.body);
                  }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]">
                  <option value="">— Manter corpo atual —</option>
                  {(templates as any[]).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Service Items */}
          <Card>
            <CardHeader><CardTitle>Itens de Serviço</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 font-medium text-gray-500 text-xs">Descrição</th>
                    <th className="text-center py-2 font-medium text-gray-500 text-xs w-16">Qtd</th>
                    <th className="text-center py-2 font-medium text-gray-500 text-xs w-24">Un</th>
                    <th className="text-right py-2 font-medium text-gray-500 text-xs w-28">Val. Unit.</th>
                    <th className="text-right py-2 font-medium text-gray-500 text-xs w-28">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2">
                        <input value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
                      </td>
                      <td className="py-1.5 px-1">
                        <input type="number" value={item.quantity} min={0} step={0.001}
                          onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
                      </td>
                      <td className="py-1.5 px-1">
                        <select value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          className="w-full border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]">
                          {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-1">
                        <input type="number" value={item.unitPrice} min={0} step={0.01}
                          onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
                      </td>
                      <td className="py-1.5 pl-2 text-right font-medium text-gray-700 whitespace-nowrap">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="py-1.5 pl-1">
                        <button onClick={() => setServiceItems((p) => p.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {discountAmount > 0 && (
                    <>
                      <tr>
                        <td colSpan={4} className="pt-3 text-right text-sm text-gray-500">Subtotal:</td>
                        <td className="pt-3 text-right text-sm text-gray-500">{formatCurrency(grossTotal)}</td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right text-sm text-green-600">Desconto ({discount.toFixed(2)}%):</td>
                        <td className="text-right text-sm text-green-600">− {formatCurrency(discountAmount)}</td>
                        <td />
                      </tr>
                    </>
                  )}
                  <tr>
                    <td colSpan={4} className="pt-2 text-right text-sm font-semibold text-gray-700">Total:</td>
                    <td className="pt-2 text-right font-bold text-[#EA580C]">{formatCurrency(totalAmount)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={6} className="pt-2">
                      <div className="flex items-center gap-2 justify-end">
                        <label className="text-xs text-gray-500">Desconto (%):</label>
                        <input type="number" min={0} max={100} step="any"
                          value={discount > 0 ? parseFloat(discount.toFixed(4)) : ""}
                          onChange={(e) => setDiscountAmountFixed(Math.round(grossTotal * ((parseFloat(e.target.value) || 0) / 100) * 100) / 100)}
                          className="w-20 h-7 px-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                          placeholder="0" />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
              <Button variant="outline" size="sm"
                onClick={() => setServiceItems((p) => [...p, { name: "", quantity: 1, unit: "SERVICE", unitPrice: 0, subtotal: 0 }])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader><CardTitle>Condições de Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {installments.map((inst, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-8">{inst.installment}ª</span>
                  <input value={inst.description} onChange={(e) => updateInstallment(idx, "description", e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                    placeholder="Descrição" />
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden w-36 focus-within:ring-1 focus-within:ring-[#EA580C]">
                    <span className="text-xs text-gray-500 px-1.5 bg-gray-50 border-r border-gray-200 select-none">R$</span>
                    <input type="text" inputMode="decimal" className="flex-1 px-2 py-1.5 text-sm focus:outline-none"
                      placeholder="0,00" value={inst.amountStr}
                      onChange={(e) => { updateInstallment(idx, "amountStr" as any, e.target.value); updateInstallment(idx, "amount", parseFloat(e.target.value.replace(",", ".")) || 0); }}
                      onBlur={() => updateInstallment(idx, "amountStr" as any, inst.amount > 0 ? inst.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "")} />
                  </div>
                  <input type="date" value={inst.dueDate} onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                    className="w-36 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C]" />
                  <button onClick={() => setInstallments((p) => p.filter((_, i) => i !== idx).map((x, i) => ({ ...x, installment: i + 1 })))}
                    className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm"
                onClick={() => setInstallments((p) => [...p, { installment: p.length + 1, dueDate: "", amount: 0, amountStr: "", description: "" }])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Parcela
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Variables panel */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Variáveis do Contrato</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="Cidade de assinatura" value={vars.cidade}
                onChange={(e) => setVars((v) => ({ ...v, cidade: e.target.value }))} placeholder="ex: São Paulo" />
              <DateVarInput label="Data de assinatura" varKey="data_assinatura" vars={vars} setVars={setVars} />
              <DateVarInput label="Data de início" varKey="data_inicio" vars={vars} setVars={setVars} />
              <Input label="Prazo (dias)" value={vars.prazo_dias}
                onChange={(e) => setVars((v) => ({ ...v, prazo_dias: e.target.value }))} placeholder="ex: 90" />
              <Input label="Valor total por extenso" value={vars.valor_total_extenso}
                onChange={(e) => setVars((v) => ({ ...v, valor_total_extenso: e.target.value }))} placeholder="ex: sessenta e cinco mil reais" />
              <Input label="Nome do responsável" value={vars.responsavel_nome}
                onChange={(e) => setVars((v) => ({ ...v, responsavel_nome: e.target.value }))} placeholder="Nome completo" />
              <Input label="CPF do responsável" value={vars.responsavel_cpf}
                onChange={(e) => setVars((v) => ({ ...v, responsavel_cpf: e.target.value }))} placeholder="000.000.000-00" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
