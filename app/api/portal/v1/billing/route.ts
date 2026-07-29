import { NextRequest } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { getPendingForClient } from "@/lib/billing";
import { isMercadoPagoEnabled } from "@/lib/mercadopago";

export async function GET(request: NextRequest) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Mesma função usada pela criação da cobrança, para o valor exibido não
  // divergir do valor cobrado — ver lib/billing.ts.
  const { pending, totalPending } = await getPendingForClient(session.clientId);

  return apiSuccess({
    summary: { totalPending, count: pending.length },
    pending,
    // A tela usa isto para decidir se mostra o botão de pagar.
    paymentEnabled: isMercadoPagoEnabled() && totalPending > 0,
  });
}
