import { prisma } from "@/lib/prisma";

// Fim do expediente: 17:00 no horário de Brasília. O Brasil não tem mais
// horário de verão desde 2019, então o fuso é fixo em UTC-3 → 17:00 BRT = 20:00 UTC.
//
// IMPORTANTE: a data do deslocamento é gravada ao MEIO-DIA UTC (T12:00 — ver
// app/api/v1/assignments/route.ts), não à meia-noite. Por isso o corte tem que
// ser o FIM do dia; usar meia-noite deixava o registro do próprio dia de fora
// (meio-dia > meia-noite) e só os dias anteriores eram finalizados.
const END_HOUR_UTC = 20; // 17:00 BRT

/**
 * Fecha automaticamente os deslocamentos "Em Andamento" cujo 17:00 (BRT) já
 * passou, virando "Concluído". Só mexe em IN_PROGRESS — SCHEDULED, COMPLETED e
 * CANCELLED ficam como estão. Nunca lança.
 */
export async function autoCompleteInProgress(): Promise<number> {
  try {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    // 17:00 BRT de hoje, em UTC. Se já passou, hoje entra no corte; senão, só
    // até ontem.
    const todays17h = Date.UTC(y, m, d, END_HOUR_UTC, 0, 0, 0);
    // Corte = FIM do dia alvo (23:59:59.999 UTC), para pegar a data gravada ao
    // meio-dia daquele dia e todos os anteriores, sem alcançar dias futuros.
    let cutoff = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
    if (now.getTime() < todays17h) {
      cutoff = new Date(cutoff.getTime() - 24 * 3600_000); // ainda não deu 17:00 → até ontem
    }

    const res = await prisma.workAssignment.updateMany({
      where: { status: "IN_PROGRESS", date: { lte: cutoff } },
      data: { status: "COMPLETED" },
    });
    return res.count;
  } catch (e: any) {
    console.error("[assignments] auto-complete falhou:", e?.message);
    return 0;
  }
}
