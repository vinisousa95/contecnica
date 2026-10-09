import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAdvanceBalances } from "@/lib/advances";

// GET /api/v1/advances/balances → saldo de adiantamento por funcionário.
// Usado na "Equipe na Obra" para alertar que a diária já foi adiantada.
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const balances = await getAdvanceBalances();
  // Só os que ainda têm saldo positivo interessam para o alerta.
  const data = Object.fromEntries(
    Object.entries(balances)
      .filter(([, b]) => b.balance > 0.001)
      .map(([id, b]) => [id, b.balance])
  );
  return apiSuccess(data);
}
