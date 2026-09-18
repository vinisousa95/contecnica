// Roda uma vez quando o servidor sobe. Usado para iniciar o agendador que
// conclui os deslocamentos "Em Andamento" às 17:00 (BRT), todo dia.
export async function register() {
  // Só no runtime Node (não no Edge, que não tem timers longos nem Prisma).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAssignmentAutoCompleteCron } = await import("@/lib/assignment-scheduler");
    startAssignmentAutoCompleteCron();
  }
}
