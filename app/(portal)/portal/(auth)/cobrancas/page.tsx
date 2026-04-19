"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import {
  ShoppingCart, CheckCircle2, Clock, AlertCircle,
  X, CreditCard, QrCode, Copy, Check,
} from "lucide-react";

async function fetchBilling() {
  const res = await fetch("/api/portal/v1/billing", { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

function PaymentModal({ expense, onClose }: { expense: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyAmount = () => {
    navigator.clipboard.writeText(expense.amount.toFixed(2).replace(".", ","));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Realizar Pagamento</h2>
            <p className="text-sm text-gray-500 mt-0.5">{expense.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount */}
        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Valor a pagar</p>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(expense.amount)}</p>
          {expense.projectName && (
            <p className="text-xs text-gray-400 mt-1">Obra: {expense.projectName}</p>
          )}
          <p className="text-xs text-gray-400">Vencimento: {formatDate(expense.dueDate)}</p>
        </div>

        {/* Gateway placeholder */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">Gateway de pagamento em configuração</p>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Em breve você poderá pagar diretamente por aqui via PIX, boleto ou cartão.
          </p>

          <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center space-y-3">
            <QrCode className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-xs text-gray-400">QR Code / PIX será disponibilizado aqui</p>
          </div>

          <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Enquanto isso</p>
            <p className="text-sm text-blue-700">
              Entre em contato com a Contécnica para realizar o pagamento via transferência ou PIX:
            </p>
            <button
              onClick={copyAmount}
              className="flex items-center gap-2 text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : `Copiar valor: ${formatCurrency(expense.amount)}`}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#EA580C] text-white font-semibold py-3 rounded-xl hover:bg-[#C2410C] transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CobrancasPage() {
  const { data, isLoading } = useQuery({ queryKey: ["portal-billing"], queryFn: fetchBilling });
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <LoadingPage message="Carregando cobranças..." />;
  if (!data) return null;

  const { summary, pending, paid } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cobranças</h1>
        <p className="text-sm text-gray-500 mt-0.5">Materiais de construção adquiridos para sua obra</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">A pagar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalPending)}</p>
              <p className="text-xs text-gray-400 mt-1">{summary.count} cobrança{summary.count !== 1 ? "s" : ""} pendente{summary.count !== 1 ? "s" : ""}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total pago</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">{paid.length} pagamento{paid.length !== 1 ? "s" : ""} realizado{paid.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Pendentes de pagamento</h2>
        </div>
        {pending.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            <CheckCircle2 className="h-8 w-8 text-green-300 mx-auto mb-2" />
            Nenhuma cobrança pendente
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pending.map((e: any) => (
              <div key={e.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.isOverdue ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.projectName && <span>{e.projectName} · </span>}
                    Vence: {formatDate(e.dueDate)}
                    {e.isOverdue && <span className="text-red-500 font-medium ml-1">· Vencido</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(e.amount)}</p>
                <button
                  onClick={() => setSelected(e)}
                  className="flex-shrink-0 bg-[#EA580C] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#C2410C] transition-colors flex items-center gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paid history */}
      {paid.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h2 className="font-semibold text-gray-900">Histórico de pagamentos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paid.map((e: any) => (
              <div key={e.id} className="flex items-center gap-4 px-6 py-3 opacity-70">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                  <p className="text-xs text-gray-400">{e.projectName}</p>
                </div>
                <p className="text-sm font-semibold text-gray-500">{formatCurrency(e.amount)}</p>
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Pago</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && <PaymentModal expense={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
