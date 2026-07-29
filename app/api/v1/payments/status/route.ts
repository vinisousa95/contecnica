import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { isMercadoPagoEnabled, mpConfig } from "@/lib/mercadopago";

/**
 * Diagnóstico do gateway (só ADMIN).
 *
 * Serve principalmente para conferir se as notificações estão chegando e se a
 * validação de assinatura está passando — é onde aparece um eventual problema
 * no template do manifest (ver lib/mercadopago.ts).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const cfg = mpConfig();

  const [webhooks, payments] = await Promise.all([
    prisma.paymentWebhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, topic: true, resourceId: true, signatureOk: true, handled: true, note: true, createdAt: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, amount: true, status: true, paymentMethod: true, paidAt: true, createdAt: true,
        providerPaymentId: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  return apiSuccess({
    configured: isMercadoPagoEnabled(),
    hasWebhookSecret: !!cfg.webhookSecret,
    webhookUrl: cfg.publicUrl ? `${cfg.publicUrl}/api/webhooks/mercadopago` : null,
    recentWebhooks: webhooks,
    recentPayments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  });
}
