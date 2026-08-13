import { createHmac, timingSafeEqual } from "crypto";

/**
 * Cliente do Mercado Pago — Checkout Pro.
 *
 * ARQUITETURA DE CONFIANÇA (importante):
 * O webhook do Mercado Pago só nos diz "o pagamento X mudou". Ele NÃO é a fonte
 * da verdade. Ao receber a notificação, consultamos `GET /v1/payments/{id}` com
 * o nosso access token e confiamos apenas nessa resposta. Assim, uma notificação
 * forjada no máximo provoca uma consulta que devolve "não aprovado".
 *
 * A validação de assinatura é defesa adicional, não a proteção principal.
 */

const API = "https://api.mercadopago.com";
const TIMEOUT_MS = 15_000;

export function mpConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return { accessToken, webhookSecret, publicUrl, configured: !!(accessToken && publicUrl) };
}

export function isMercadoPagoEnabled(): boolean {
  return mpConfig().configured;
}

/**
 * Erro da API do Mercado Pago, carregando o status HTTP.
 *
 * O status importa no webhook: 4xx é definitivo (o pagamento não existe, o id é
 * inválido) e reenviar não muda nada; 5xx e falha de rede são transitórios e vale
 * pedir reenvio. Sem o status, todo erro parecia igual.
 */
export class MercadoPagoApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MercadoPagoApiError";
  }

  /** Erro que nenhum reenvio vai resolver. */
  get isPermanent(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

async function mpFetch(path: string, init: RequestInit = {}) {
  const { accessToken } = mpConfig();
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = body?.message ?? body?.error ?? `HTTP ${res.status}`;
      throw new MercadoPagoApiError(
        typeof detail === "string" ? detail : JSON.stringify(detail),
        res.status
      );
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// ── Preferência (Checkout Pro) ───────────────────────────────────────────────

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

/**
 * Tipos de pagamento do Mercado Pago que nos interessam no Brasil.
 * `bank_transfer` é o PIX. Os demais são autoexplicativos.
 */
export const MP_PAYMENT_TYPES = [
  "credit_card",
  "debit_card",
  "prepaid_card",
  "ticket", // boleto
  "bank_transfer", // PIX
  "account_money", // saldo Mercado Pago
] as const;

export type MpPaymentType = (typeof MP_PAYMENT_TYPES)[number];

export interface CreatePreferenceInput {
  /** Nosso Payment.id — volta na notificação como external_reference. */
  externalReference: string;
  items: PreferenceItem[];
  payer?: { name?: string | null; email?: string | null };
  description?: string;
  /**
   * Formas de pagamento permitidas. Tudo que NÃO estiver aqui é excluído no
   * checkout. Omitir libera todas. Ex.: `["bank_transfer"]` = só PIX.
   */
  allowedPaymentTypes?: MpPaymentType[];
}

export interface PreferenceResult {
  id: string;
  /** URL do checkout para onde o cliente é enviado. */
  initPoint: string;
}

export async function createPreference(input: CreatePreferenceInput): Promise<PreferenceResult> {
  const { publicUrl } = mpConfig();

  const body = {
    external_reference: input.externalReference,
    items: input.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency_id: "BRL",
    })),
    ...(input.payer?.email ? { payer: { email: input.payer.email, name: input.payer.name ?? undefined } } : {}),
    back_urls: {
      success: `${publicUrl}/portal/cobrancas/retorno?status=sucesso`,
      pending: `${publicUrl}/portal/cobrancas/retorno?status=pendente`,
      failure: `${publicUrl}/portal/cobrancas/retorno?status=falha`,
    },
    // Só volta automaticamente quando aprovado; pendente (boleto/PIX) fica na
    // tela do MP com as instruções de pagamento.
    auto_return: "approved",
    notification_url: `${publicUrl}/api/webhooks/mercadopago`,
    statement_descriptor: "CONTECNICA",
    // Restrição de forma de pagamento: exclui tudo que não está na allowlist.
    // A checagem é do lado do MP, não escondendo botão — o cliente não consegue
    // pagar por um meio que a Contécnica não liberou para aquele grupo.
    ...(input.allowedPaymentTypes && {
      payment_methods: {
        excluded_payment_types: MP_PAYMENT_TYPES
          .filter((t) => !input.allowedPaymentTypes!.includes(t))
          .map((id) => ({ id })),
      },
    }),
  };

  const pref = await mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { id: pref.id, initPoint: pref.init_point };
}

// ── Consulta de pagamento (a fonte da verdade) ───────────────────────────────

export interface MpPayment {
  id: number;
  status: string;            // approved | pending | rejected | cancelled | refunded ...
  statusDetail?: string;
  externalReference?: string | null;
  amount: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
}

export async function getPayment(paymentId: string): Promise<MpPayment> {
  const p = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
  return {
    id: p.id,
    status: p.status,
    statusDetail: p.status_detail,
    externalReference: p.external_reference ?? null,
    amount: Number(p.transaction_amount ?? 0),
    paymentMethod: p.payment_method_id ?? null,
    paidAt: p.date_approved ?? null,
  };
}

// ── Assinatura do webhook (defesa adicional) ─────────────────────────────────

export interface SignatureCheck {
  ok: boolean;
  /** Preenchido quando falha, para diagnóstico no log. */
  reason?: string;
}

/**
 * Valida o header `x-signature` (`ts=...,v1=...`).
 *
 * O manifest documentado pelo Mercado Pago é:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * assinado com HMAC-SHA256 usando a chave secreta do webhook.
 *
 * ATENÇÃO: não conseguimos confirmar esse template em fonte oficial (os SDKs do
 * MP não expõem helper de validação e a documentação não publica a string).
 * Por isso a segurança do fluxo NÃO depende disto: a confirmação vale pela
 * consulta a `getPayment`. Se a validação estiver rejeitando notificações
 * legítimas, o log e o endpoint de diagnóstico mostram o motivo e o template
 * pode ser ajustado aqui num só lugar.
 */
export function verifyWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): SignatureCheck {
  const { webhookSecret } = mpConfig();
  if (!webhookSecret) return { ok: false, reason: "MERCADOPAGO_WEBHOOK_SECRET não configurado" };
  if (!params.xSignature) return { ok: false, reason: "header x-signature ausente" };
  if (!params.dataId) return { ok: false, reason: "data.id ausente" };

  const parts = Object.fromEntries(
    params.xSignature.split(",").map((kv) => {
      const [k, ...v] = kv.split("=");
      return [k.trim(), v.join("=").trim()];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: "x-signature sem ts ou v1" };

  // Rejeita notificação antiga (proteção contra replay). 10 minutos de folga.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 600) {
    return { ok: false, reason: `timestamp fora da janela (${Math.round(age)}s)` };
  }

  // data.id vem em minúsculas no manifest quando é alfanumérico.
  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return { ok: false, reason: "assinatura com tamanho inesperado" };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "assinatura não confere" };

  return { ok: true };
}
