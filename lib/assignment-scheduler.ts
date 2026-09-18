import { autoCompleteInProgress } from "@/lib/assignments-autocomplete";

// Agendador que fecha os deslocamentos "Em Andamento" cravado às 17:00 de
// Brasília, todo dia, mesmo sem ninguém acessando o sistema.
//
// 17:00 BRT = 20:00:00 UTC (o Brasil não tem horário de verão desde 2019, então
// o fuso é fixo em UTC-3). Roda dentro do processo Node de longa duração (o
// `next start` sob pm2), disparado uma vez no boot via instrumentation.ts.
const TARGET_UTC_HOUR = 20;
const GLOBAL_KEY = "__contecnica_assignment_cron__";

/** Milissegundos até o próximo 20:00 UTC (17:00 BRT). */
function msUntilNextRun(): number {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TARGET_UTC_HOUR, 0, 0, 0)
  );
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export function startAssignmentAutoCompleteCron() {
  const g = globalThis as unknown as Record<string, boolean>;
  if (g[GLOBAL_KEY]) return; // evita duplicar (hot reload / múltiplos registros)
  g[GLOBAL_KEY] = true;

  // No boot, encerra o que já passou das 17:00 enquanto o servidor estava fora.
  autoCompleteInProgress().catch(() => {});

  const schedule = () => {
    setTimeout(async () => {
      await autoCompleteInProgress().catch(() => {});
      schedule(); // reagenda para o próximo dia
    }, msUntilNextRun());
  };
  schedule();
}
