import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/utils";
import { generateDailyExpense } from "@/lib/assignments";

/**
 * Gera a diária de um agendamento que ficou "Sem diária" — caso o valor da
 * diária do funcionário tenha sido cadastrado depois de agendar. Ver
 * lib/assignments.ts.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const result = await generateDailyExpense(params.id, session.userId);
  if (!result.ok) return apiError(result.reason, result.status);

  return apiSuccess({ message: "Diária gerada" });
}
