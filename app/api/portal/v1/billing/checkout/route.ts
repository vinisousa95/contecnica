import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { blockedByOnboarding } from "@/lib/portal-guard";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { getPendingForClient, toSnapshot } from "@/lib/billing";
import { createPreference, isMercadoPagoEnabled } from "@/lib/mercadopago";

/**
 * Cria a cobrança no Mercado Pago (Checkout Pro) e devolve a URL do checkout.
 *
 * O corpo da requisição é ignorado de propósito: o valor e os itens são sempre
 * recalculados aqui, no servidor. Aceitar valor do cliente seria permitir que
 * ele pagasse R$ 1,00 por uma dívida de R$ 5.000,00.
 */
export async function POST(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Ato de vontade: exige o primeiro acesso concluído. Ver lib/portal-guard.ts.
  const bloqueio = await blockedByOnboarding(session.clientUserId);
  if (bloqueio) return apiError(bloqueio, 403);

  if (!isMercadoPagoEnabled()) {
    return apiError("Pagamento online não está configurado. Fale com a Contécnica.", 503);
  }

  const { pending, totalPending } = await getPendingForClient(session.clientId);

  if (pending.length === 0 || totalPending <= 0) {
    return apiError("Não há valores pendentes para pagar.", 409);
  }

  // Reaproveita uma cobrança pendente idêntica em vez de criar outra a cada
  // clique — evita encher o painel do MP de preferências abandonadas.
  const snapshot = toSnapshot(pending);
  const existing = await prisma.payment.findFirst({
    where: { clientId: session.clientId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const sameItems =
    existing &&
    Number(existing.amount) === totalPending &&
    JSON.stringify(existing.items) === JSON.stringify(snapshot);

  if (sameItems && existing!.checkoutUrl) {
    return apiSuccess({ paymentId: existing!.id, checkoutUrl: existing!.checkoutUrl });
  }

  const payment = await prisma.payment.create({
    data: {
      clientId: session.clientId,
      amount: totalPending,
      items: snapshot as any,
      status: "PENDING",
    },
  });

  try {
    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      select: { name: true, email: true },
    });

    // Um item por linha no checkout: o cliente vê o que está pagando.
    const pref = await createPreference({
      externalReference: payment.id,
      payer: { name: client?.name ?? session.name, email: client?.email ?? session.email },
      items: pending.map((p) => ({
        title: `${p.category} — ${p.description}`.slice(0, 250),
        quantity: 1,
        unit_price: p.amount,
      })),
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { preferenceId: pref.id, checkoutUrl: pref.initPoint },
    });

    return apiSuccess({ paymentId: payment.id, checkoutUrl: pref.initPoint });
  } catch (err: any) {
    // Não deixa a cobrança órfã em PENDING se o gateway recusou.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" },
    }).catch(() => {});

    console.error("[mercadopago] falha ao criar preferência:", err?.message);
    return apiError("Não foi possível iniciar o pagamento. Tente novamente.", 502);
  }
}
