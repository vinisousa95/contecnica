import { normalizeBrazilPhone } from "./phone";

/**
 * Cliente da Evolution API (self-hosted) para envio de WhatsApp.
 *
 * Contrato conferido no código-fonte da Evolution v2:
 *   POST {EVOLUTION_API_URL}/message/sendText/{instancia}
 *   header: apikey: <chave>
 *   body:   { number, text, delay?, linkPreview? }
 *
 * IMPORTANTE — a Evolution usa o protocolo do WhatsApp Web (Baileys), que não é
 * oficial. Use um chip dedicado, não o número principal da empresa: a Meta pode
 * banir o número.
 */

export interface SendResult {
  ok: boolean;
  /** Motivo legível quando falha — serve para gravar no log e mostrar na tela. */
  error?: string;
  /** Id da mensagem devolvido pela Evolution, quando houver. */
  messageId?: string;
  /** Número normalizado que foi usado no envio. */
  to?: string;
}

const TIMEOUT_MS = 12_000;

export function whatsappConfig() {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  return { url, key, instance, configured: !!(url && key && instance) };
}

/** True quando as três variáveis de ambiente estão presentes. */
export function isWhatsappEnabled(): boolean {
  return whatsappConfig().configured;
}

/**
 * Envia uma mensagem de texto.
 *
 * Nunca lança: devolve `{ ok: false, error }`. Quem chama está normalmente num
 * fluxo em que a notificação é secundária (criar um deslocamento, por exemplo)
 * e não pode quebrar por causa do WhatsApp.
 */
export async function sendWhatsappText(rawPhone: string | null | undefined, text: string): Promise<SendResult> {
  const { url, key, instance, configured } = whatsappConfig();
  if (!configured) {
    return { ok: false, error: "WhatsApp não configurado no servidor" };
  }

  const phone = normalizeBrazilPhone(rawPhone);
  if (!phone.ok) return { ok: false, error: phone.reason };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${url}/message/sendText/${encodeURIComponent(instance!)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key! },
      body: JSON.stringify({
        number: phone.e164,
        text,
        // Pequeno atraso simula digitação e reduz o padrão de "robô".
        delay: 1200,
        linkPreview: false,
      }),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      // A Evolution devolve o motivo em formatos diferentes conforme o erro.
      const detail =
        body?.response?.message ??
        body?.message ??
        body?.error ??
        `HTTP ${res.status}`;
      return {
        ok: false,
        to: phone.e164,
        error: typeof detail === "string" ? detail : JSON.stringify(detail),
      };
    }

    return { ok: true, to: phone.e164, messageId: body?.key?.id ?? undefined };
  } catch (err: any) {
    const error = err?.name === "AbortError"
      ? "Tempo esgotado ao falar com a Evolution API"
      : err?.message ?? "Falha de rede ao falar com a Evolution API";
    return { ok: false, to: phone.e164, error };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checa se a instância está conectada (QR code lido).
 * Útil para uma tela de diagnóstico: sem isso, o envio falha silenciosamente
 * do ponto de vista de quem só olha a interface.
 */
export async function whatsappConnectionState(): Promise<{ connected: boolean; state?: string; error?: string }> {
  const { url, key, instance, configured } = whatsappConfig();
  if (!configured) return { connected: false, error: "WhatsApp não configurado no servidor" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/instance/connectionState/${encodeURIComponent(instance!)}`, {
      headers: { apikey: key! },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { connected: false, error: body?.message ?? `HTTP ${res.status}` };

    const state = body?.instance?.state ?? body?.state;
    return { connected: state === "open", state };
  } catch (err: any) {
    return { connected: false, error: err?.message ?? "Falha ao consultar a Evolution API" };
  } finally {
    clearTimeout(timer);
  }
}
