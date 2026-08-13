"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import {
  ShoppingCart, CheckCircle2, AlertCircle,
  X, CreditCard, QrCode, Copy, Check, Clock, FileText, ExternalLink, Wrench,
} from "lucide-react";

type BillingGroup = "materials" | "services";

/** Cria a cobrança de um grupo no gateway e devolve a URL do checkout. */
async function startCheckout(group: BillingGroup): Promise<string> {
  const res = await fetch("/api/portal/v1/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Não foi possível iniciar o pagamento.");
  return json.data.checkoutUrl;
}

async function fetchBilling() {
  const res = await fetch("/api/portal/v1/billing", { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

/**
 * Detalhe de um item pendente.
 *
 * Não paga item a item: o Checkout Pro cobra o total pendente de uma vez, e é o
 * botão do topo que inicia isso. Este modal existe para o cliente conferir de
 * onde vem o valor — e ver a nota fiscal, quando a Contécnica libera.
 */
function PaymentModal({
  item,
  onClose,
  paymentEnabled,
  onPay,
  paying,
}: {
  item: any;
  onClose: () => void;
  paymentEnabled: boolean;
  onPay: () => void;
  paying: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyAmount = () => {
    navigator.clipboard.writeText(item.amount.toFixed(2).replace(".", ","));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isService = item.type === "extra_service";
  const label = isService ? "Serviço Extra" : "Reembolso de Material";
  const meiosTexto = isService ? "cartão de crédito, débito ou PIX" : "PIX";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Detalhe da cobrança</h2>
            <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(item.amount)}</p>
          {item.projectName && <p className="text-xs text-gray-400 mt-1">Obra: {item.projectName}</p>}
          {item.dueDate && <p className="text-xs text-gray-400">Referência: {formatDate(item.dueDate)}</p>}
          {item.attachmentUrl && (
            <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#EA580C] font-medium hover:underline">
              <FileText className="h-3.5 w-3.5" />
              Ver nota fiscal
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="p-6 space-y-4">
          {paymentEnabled ? (
            <>
              <p className="text-sm text-gray-600">
                O pagamento reúne {isService ? "os serviços extras" : "os materiais"} pendentes
                num só checkout, pago por {meiosTexto}. Este item entra nesse total.
              </p>
              <button
                onClick={onPay}
                disabled={paying}
                className="w-full bg-[#EA580C] text-white font-semibold py-3 rounded-xl hover:bg-[#C2410C] transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {paying ? "Abrindo pagamento..." : `Pagar ${isService ? "serviços extras" : "materiais"}`}
              </button>
              <button
                onClick={onClose}
                className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fechar
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-medium">Pagamento online indisponível no momento</p>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Como pagar</p>
                <p className="text-sm text-blue-700">Entre em contato com a Contécnica para combinar o pagamento:</p>
                <button onClick={copyAmount}
                  className="flex items-center gap-2 text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : `Copiar valor: ${formatCurrency(item.amount)}`}
                </button>
              </div>
              <button onClick={onClose}
                className="w-full bg-[#EA580C] text-white font-semibold py-3 rounded-xl hover:bg-[#C2410C] transition-colors flex items-center justify-center gap-2">
                Entendido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemRow({ item, onDetails }: { item: any; onDetails: () => void }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isOverdue ? "bg-red-500" : "bg-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {item.projectName && <span>{item.projectName} · </span>}
          {item.category}
          {item.isOverdue && <span className="text-red-500 font-medium ml-1">· Vencido</span>}
        </p>
        {item.attachmentUrl && (
          <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-0.5 text-xs text-[#EA580C] hover:underline">
            <FileText className="h-3 w-3" />
            Nota fiscal
          </a>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.amount)}</p>
      <button onClick={onDetails}
        className="flex-shrink-0 border border-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
        Detalhes
      </button>
    </div>
  );
}

export default function CobrancasPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["portal-billing"], queryFn: fetchBilling });
  const [selected, setSelected] = useState<any>(null);
  const [paying, setPaying] = useState<BillingGroup | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async (group: BillingGroup) => {
    setPaying(group);
    setPayError(null);
    try {
      // Redireciona para o Mercado Pago. O valor é calculado no servidor.
      window.location.href = await startCheckout(group);
    } catch (e: any) {
      setPayError(e?.message ?? "Não foi possível iniciar o pagamento.");
      setPaying(null);
    }
  };

  if (isLoading) return <LoadingPage message="Carregando cobranças..." />;
  if (isError) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Cobranças</h1>
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        Erro ao carregar cobranças. Tente recarregar a página.
        {error instanceof Error && <p className="text-xs mt-1 text-red-500">{error.message}</p>}
      </div>
    </div>
  );
  if (!data) return null;

  const { pending } = data;

  const materials = pending.filter((e: any) => e.type === "material" || !e.type);
  const extraServices = pending.filter((e: any) => e.type === "extra_service");

  const totalMaterials = materials.reduce((s: number, e: any) => s + e.amount, 0);
  const totalExtras = extraServices.reduce((s: number, e: any) => s + e.amount, 0);
  const totalGeral = totalMaterials + totalExtras;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cobranças</h1>
        <p className="text-sm text-gray-500 mt-0.5">Valores pendentes de pagamento para sua obra</p>
      </div>

      {payError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {payError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm sm:col-span-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total geral</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalGeral)}</p>
          <p className="text-xs text-gray-400 mt-1">{pending.length} item{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Reembolso de Material</p>
          </div>
          <p className="text-xl font-bold text-amber-900">{formatCurrency(totalMaterials)}</p>
          <p className="text-xs text-amber-600 mt-1">{materials.length} item{materials.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-[#EA580C]" />
            <p className="text-xs text-[#EA580C] font-semibold uppercase tracking-wide">Serviços Extras</p>
          </div>
          <p className="text-xl font-bold text-orange-900">{formatCurrency(totalExtras)}</p>
          <p className="text-xs text-orange-600 mt-1">{extraServices.length} serviço{extraServices.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Materials section — pagamento só por PIX */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <ShoppingCart className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Reembolso de Materiais</h2>
          <span className="text-xs text-gray-400 font-medium">{formatCurrency(totalMaterials)}</span>
          {data.paymentEnabled && materials.length > 0 && (
            <button
              onClick={() => handlePay("materials")}
              disabled={paying !== null}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />
              {paying === "materials" ? "Abrindo..." : `Pagar ${formatCurrency(totalMaterials)} via PIX`}
            </button>
          )}
        </div>
        {materials.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            <CheckCircle2 className="h-7 w-7 text-green-300 mx-auto mb-2" />
            Nenhum material pendente
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {materials.map((e: any) => (
                <ItemRow key={e.id} item={e} onDetails={() => setSelected(e)} />
              ))}
            </div>
            <p className="px-6 py-2.5 text-xs text-gray-400 border-t border-gray-50">
              Reembolso de materiais é pago somente por PIX.
            </p>
          </>
        )}
      </div>

      {/* Extra services section — cartão de crédito, débito ou PIX */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <Wrench className="h-4 w-4 text-[#EA580C]" />
          <h2 className="font-semibold text-gray-900">Serviços Extras</h2>
          <span className="text-xs text-gray-400 font-medium">{formatCurrency(totalExtras)}</span>
          {data.paymentEnabled && extraServices.length > 0 && (
            <button
              onClick={() => handlePay("services")}
              disabled={paying !== null}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {paying === "services" ? "Abrindo..." : `Pagar ${formatCurrency(totalExtras)}`}
            </button>
          )}
        </div>
        {extraServices.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            <CheckCircle2 className="h-7 w-7 text-green-300 mx-auto mb-2" />
            Nenhum serviço extra pendente
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {extraServices.map((e: any) => (
                <ItemRow key={e.id} item={e} onDetails={() => setSelected(e)} />
              ))}
            </div>
            <p className="px-6 py-2.5 text-xs text-gray-400 border-t border-gray-50">
              Pague com cartão de crédito, débito ou PIX.
            </p>
          </>
        )}
      </div>

      {selected && (
        <PaymentModal
          item={selected}
          onClose={() => setSelected(null)}
          paymentEnabled={!!data.paymentEnabled}
          onPay={() => handlePay(selected.type === "extra_service" ? "services" : "materials")}
          paying={paying !== null}
        />
      )}
    </div>
  );
}
