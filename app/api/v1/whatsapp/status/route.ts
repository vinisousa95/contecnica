import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { isWhatsappEnabled, whatsappConnectionState } from "@/lib/whatsapp/evolution";

/**
 * Diagnóstico do WhatsApp: dá para ver se está configurado, se a instância está
 * conectada (QR lido) e os últimos envios. Sem isso, uma falha de envio só
 * aparece no log do servidor.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  const configured = isWhatsappEnabled();
  const connection = configured
    ? await whatsappConnectionState()
    : { connected: false, error: "WhatsApp não configurado no servidor" };

  const recent = await prisma.whatsappLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, kind: true, status: true, to: true,
      error: true, createdAt: true, assignmentId: true,
    },
  });

  return apiSuccess({ configured, ...connection, recent });
}
