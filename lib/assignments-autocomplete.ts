import { prisma } from "@/lib/prisma";

// Fim do expediente: 17:00 no horário de Brasília. O Brasil não tem mais
// horário de verão desde 2019, então o fuso é fixo em UTC-3 → 17:00 BRT = 20:00 UTC.
const END_HOUR_BRT = 17;
const BRT_OFFSET_HOURS = 3;

/**
 * Fecha automaticamente os deslocamentos "Em Andamento" cujo 17:00 (BRT) já
 * passou, virando "Concluído". Só mexe em IN_PROGRESS — SCHEDULED, COMPLETED e
 * CANCELLED ficam como estão.
 *
 * Não usa agendador: é chamado ao listar os deslocamentos, então a situação se
 * corrige sozinha sempre que alguém abre a tela depois das 17:00. Nunca lança —
 * se falhar, a listagem segue normal.
 *
 * As datas são gravadas à meia-noite UTC do dia local (convenção do sistema).
 * `maxDate` é a meia-noite do dia mais recente cujo 17:00 já passou; tudo com
 * `date <= maxDate` e ainda em andamento é encerrado.
 */
export async function autoCompleteInProgress(): Promise<number> {
  try {
    const now = Date.now();
    // Relógio de parede em Brasília.
    const brt = new Date(now - BRT_OFFSET_HOURS * 3600_000);
    const dayMidnightUtc = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
    // Se já passou das 17:00 hoje, o dia de hoje entra; senão, só até ontem.
    const cutoff =
      brt.getUTCHours() >= END_HOUR_BRT ? dayMidnightUtc : dayMidnightUtc - 24 * 3600_000;

    const res = await prisma.workAssignment.updateMany({
      where: { status: "IN_PROGRESS", date: { lte: new Date(cutoff) } },
      data: { status: "COMPLETED" },
    });
    return res.count;
  } catch (e: any) {
    console.error("[assignments] auto-complete falhou:", e?.message);
    return 0;
  }
}
