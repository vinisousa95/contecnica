import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { blockedByOnboarding, impersonationBlock } from "@/lib/portal-guard";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import {
  getPendingForClient,
  toSnapshot,
  snapshotKey,
  type BillingGroup,
} from "@/lib/billing";
import { createPreference, isMercadoPagoEnabled, type MpPaymentType } from "@/lib/mercadopago";

/**
 * Formas de pagamento por grupo.
 *   - materiais: só PIX. É reembolso de custo (a Contécnica repassa o que gastou);
 *     não faz sentido pagar taxa de cartão sobre repasse.
 *   - serviços: cartão de crédito, débito e PIX. É a receita da Contécnica, que
 *     assume a taxa em troca da facilidade para o cliente.
 * `bank_transfer` é o PIX no Mercado Pago.
 */
const PAYMENT_TYPES_BY_GROUP: Record<BillingGroup, MpPaymentType[]> = {
  materials: ["bank_transfer"],
  services: ["credit_card", "debit_card", "bank_transfer"],
};

const GROUP_LABEL: Record<BillingGroup, string> = {
  materials: "materiais",
  services: "serviços extras",
};

/**
 * Cria a cobrança no Mercado Pago (Checkout Pro) e devolve a URL do checkout.
 *
 * O corpo é usado só para escolher o GRUPO (materiais ou serviços). Valor e itens
 * são sempre recalculados no servidor — aceitar valor do cliente seria permitir
 * que ele pagasse R$ 1,00 por uma dívida de R$ 5.000,00.
 *
 * Um checkout por grupo, e não um só, porque as formas de pagamento diferem: o
 * Mercado Pago aplica a restrição por preferência, então materiais (PIX) e
 * serviços (cartão/PIX) não cabem na mesma cobrança.
 */
export async function POST(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Ato de vontade: exige o primeiro acesso concluído. Ver lib/portal-guard.ts.
  // Impersonação (admin vendo como cliente) é somente-visualização.
  const impBlock = impersonationBlock(session);
  if (impBlock) return apiError(impBlock, 403);

  const bloqueio = await blockedByOnboarding(session.clientUserId);
  if (bloqueio) return apiError(bloqueio, 403);

  if (!isMercadoPagoEnabled()) {
    return apiError("Pagamento online não está configurado. Fale com a Contécnica.", 503);
  }

  const body = await request.json().catch(() => ({}));
  const group: BillingGroup = body?.group === "services" ? "services" : "materials";

  const { pending, totalPending } = await getPendingForClient(session.clientId, group);

  if (pending.length === 0 || totalPending <= 0) {
    return apiError(`Não há ${GROUP_LABEL[group]} pendentes para pagar.`, 409);
  }

  // Reaproveita uma cobrança pendente idêntica em vez de criar outra a cada
  // clique — evita encher o painel do MP de preferências abandonadas. Como agora
  // há dois grupos, comparamos o snapshot inteiro: só reaproveita a cobrança do
  // MESMO grupo, com os mesmos itens e valor.
  const snapshot = toSnapshot(pending);
  const wantKey = snapshotKey(snapshot);
  const recentPending = await prisma.payment.findMany({
    where: { clientId: session.clientId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  // snapshotKey e não JSON.stringify: o Postgres guarda `items` como JSONB e
  // reordena as chaves, então comparar o JSON cru nunca casa. A chave canônica
  // ordena por id e ignora a ordem das chaves.
  const reusable = recentPending.find(
    (p) => p.checkoutUrl && snapshotKey(p.items as any) === wantKey
  );

  if (reusable) {
    return apiSuccess({ paymentId: reusable.id, checkoutUrl: reusable.checkoutUrl });
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
      allowedPaymentTypes: PAYMENT_TYPES_BY_GROUP[group],
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
