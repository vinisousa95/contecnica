import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, verifyWebhookSignature, isMercadoPagoEnabled } from "@/lib/mercadopago";
import type { PaymentItemSnapshot } from "@/lib/billing";

/**
 * Notificação de pagamento do Mercado Pago.
 *
 * Rota PÚBLICA (liberada no middleware) — o Mercado Pago não tem sessão nossa.
 *
 * A notificação NÃO é fonte da verdade. Ela só informa qual pagamento mudou;
 * nós consultamos `GET /v1/payments/{id}` com o nosso access token e agimos
 * apenas com base nessa resposta. Uma notificação forjada, na pior hipótese,
 * provoca uma consulta que devolve "não aprovado".
 *
 * Sempre responde 200: o Mercado Pago reenvia em caso de erro, e reenvio de algo
 * que já tratamos só gera ruído. Falhas ficam registradas em PaymentWebhookLog.
 */

const ok = () => NextResponse.json({ received: true });

/**
 * Sinal de vida. O Mercado Pago só usa POST; isto existe porque abrir a URL no
 * navegador é a primeira coisa que se faz ao configurar o webhook, e sem um GET
 * o Next devolve 405 com corpo vazio — indistinguível de "não subiu".
 * Não revela configuração: para isso existe /api/v1/payments/status (ADMIN).
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "mercadopago",
    message: "Webhook ativo. As notificações do Mercado Pago chegam via POST.",
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    /* MP às vezes notifica só via query string */
  }

  const topic = body?.type ?? body?.topic ?? searchParams.get("type") ?? searchParams.get("topic");
  // O id do recurso vem em lugares diferentes conforme o formato da notificação.
  const resourceId =
    body?.data?.id?.toString() ??
    searchParams.get("data.id") ??
    searchParams.get("id") ??
    null;

  const log = (fields: Record<string, unknown>) =>
    prisma.paymentWebhookLog
      .create({ data: { topic: topic ?? null, resourceId, ...fields } as any })
      .catch((e) => console.error("[mercadopago] falha ao gravar log:", e?.message));

  if (!isMercadoPagoEnabled()) {
    await log({ signatureOk: false, handled: false, note: "Mercado Pago não configurado" });
    return ok();
  }

  const sig = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: resourceId,
  });

  if (!sig.ok) {
    // Rejeita, mas registra o motivo: se o template do manifest estiver errado,
    // é aqui que isso aparece (ver comentário em lib/mercadopago.ts).
    console.error("[mercadopago] assinatura inválida:", sig.reason);
    await log({ signatureOk: false, handled: false, note: `Assinatura inválida: ${sig.reason}` });
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  // Só nos interessa notificação de pagamento.
  if (topic !== "payment" && topic !== "payments") {
    await log({ signatureOk: true, handled: false, note: `Tópico ignorado: ${topic}` });
    return ok();
  }

  if (!resourceId) {
    await log({ signatureOk: true, handled: false, note: "Notificação sem id do pagamento" });
    return ok();
  }

  try {
    // ── A fonte da verdade ──
    const mp = await getPayment(resourceId);

    if (!mp.externalReference) {
      await log({ signatureOk: true, handled: false, note: "Pagamento sem external_reference" });
      return ok();
    }

    const payment = await prisma.payment.findUnique({ where: { id: mp.externalReference } });
    if (!payment) {
      await log({ signatureOk: true, handled: false, note: `Cobrança ${mp.externalReference} não encontrada` });
      return ok();
    }

    // Idempotência: reenvio da mesma notificação não marca nada duas vezes.
    if (payment.status === "APPROVED") {
      await log({ signatureOk: true, handled: true, note: "Já estava aprovada (reenvio)" });
      return ok();
    }

    const status = mapStatus(mp.status);

    if (status !== "APPROVED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status, providerPaymentId: String(mp.id), paymentMethod: mp.paymentMethod },
      });
      await log({ signatureOk: true, handled: true, note: `Status ${mp.status} → ${status}` });
      return ok();
    }

    // Confere o valor: se não bate com o que cobramos, não damos baixa.
    const expected = Number(payment.amount);
    if (Math.abs(mp.amount - expected) > 0.01) {
      console.error(`[mercadopago] valor divergente: cobrado ${expected}, pago ${mp.amount}`);
      await log({
        signatureOk: true, handled: false,
        note: `Valor divergente: cobrado ${expected}, pago ${mp.amount} — baixa NÃO aplicada`,
      });
      return ok();
    }

    // Aprovado e conferido: dá baixa nos itens do snapshot, numa transação.
    const items = (payment.items as unknown as PaymentItemSnapshot[]) ?? [];
    const materialIds = items.filter((i) => i.type === "material").map((i) => i.id);
    const serviceIds = items.filter((i) => i.type === "extra_service").map((i) => i.id);
    const now = new Date();

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "APPROVED",
          providerPaymentId: String(mp.id),
          paymentMethod: mp.paymentMethod,
          paidAt: mp.paidAt ? new Date(mp.paidAt) : now,
        },
      }),
      ...(materialIds.length
        ? [prisma.expense.updateMany({
            where: { id: { in: materialIds } },
            data: { clientPaid: true, clientPaidAt: now },
          })]
        : []),
      ...(serviceIds.length
        ? [prisma.extraService.updateMany({
            where: { id: { in: serviceIds } },
            data: { paidAt: now },
          })]
        : []),
    ]);

    await log({
      signatureOk: true, handled: true,
      note: `Aprovado: ${materialIds.length} material(is) e ${serviceIds.length} serviço(s) baixados`,
    });
    return ok();
  } catch (err: any) {
    console.error("[mercadopago] erro ao processar notificação:", err?.message);
    await log({ signatureOk: true, handled: false, note: `Erro: ${err?.message}` });
    // 500 faz o MP reenviar — o que é desejável num erro transitório.
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}

function mapStatus(mpStatus: string): "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" {
  switch (mpStatus) {
    case "approved":
    case "authorized":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING"; // pending, in_process, in_mediation
  }
}
