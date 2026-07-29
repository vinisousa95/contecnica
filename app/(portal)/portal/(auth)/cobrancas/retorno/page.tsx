"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";

/**
 * Tela de retorno do Mercado Pago.
 *
 * Só informativa: o status que chega aqui vem da URL, ou seja, do navegador do
 * cliente — não serve como confirmação. A baixa dos itens acontece apenas no
 * webhook, depois de consultarmos a API do Mercado Pago. Por isso o texto evita
 * afirmar que a dívida foi quitada e diz que a atualização aparece em instantes.
 */
function Conteudo() {
  const status = useSearchParams().get("status");

  const view = {
    sucesso: {
      Icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      title: "Pagamento recebido",
      text: "Recebemos a confirmação do seu pagamento. A baixa dos itens aparece na tela de Cobranças em alguns instantes, assim que o Mercado Pago confirmar a operação para nós.",
    },
    pendente: {
      Icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      title: "Pagamento em processamento",
      text: "Seu pagamento está sendo processado. Boleto pode levar até 3 dias úteis para ser confirmado; PIX costuma ser em minutos. Os itens saem da lista de pendentes automaticamente quando a confirmação chegar.",
    },
    falha: {
      Icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      title: "Pagamento não concluído",
      text: "O pagamento não foi concluído e nada foi cobrado. Você pode tentar novamente na tela de Cobranças ou falar com a Contécnica.",
    },
  }[status ?? "pendente"] ?? {
    Icon: Clock,
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
    title: "Status desconhecido",
    text: "Não conseguimos identificar o resultado do pagamento. Confira a tela de Cobranças em alguns instantes.",
  };

  const { Icon, color, bg, title, text } = view;

  return (
    <div className="mx-auto max-w-lg space-y-5 py-4">
      <div className={`rounded-2xl border ${bg} px-6 py-8 text-center`}>
        <Icon className={`mx-auto h-12 w-12 ${color}`} />
        <h1 className="mt-4 text-lg font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
      </div>

      <Link
        href="/portal/cobrancas"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#EA580C] hover:text-[#C2410C]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Cobranças
      </Link>
    </div>
  );
}

export default function RetornoPagamentoPage() {
  // useSearchParams exige Suspense no App Router.
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}
