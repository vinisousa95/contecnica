import { prisma } from "@/lib/prisma";

export interface AdvanceBalance {
  advanced: number;
  consumed: number;
  balance: number;
}

/**
 * Saldo de adiantamento por funcionário: total adiantado menos as diárias já
 * abatidas (WorkAssignment.advanceApplied). O valor da diária abatida vem da
 * despesa vinculada ao apontamento.
 */
export async function getAdvanceBalances(): Promise<Record<string, AdvanceBalance>> {
  const [advances, applied] = await Promise.all([
    prisma.employeeAdvance.groupBy({ by: ["employeeId"], _sum: { amount: true } }),
    prisma.workAssignment.findMany({
      where: { advanceApplied: true },
      select: { employeeId: true, expense: { select: { amount: true } } },
    }),
  ]);

  const map: Record<string, AdvanceBalance> = {};
  for (const a of advances) {
    const advanced = Number(a._sum.amount ?? 0);
    map[a.employeeId] = { advanced, consumed: 0, balance: advanced };
  }
  for (const w of applied) {
    const amt = Number(w.expense?.amount ?? 0);
    const m = (map[w.employeeId] ??= { advanced: 0, consumed: 0, balance: 0 });
    m.consumed += amt;
    m.balance = Math.round((m.balance - amt) * 100) / 100;
  }
  return map;
}

export async function getBalanceFor(employeeId: string): Promise<number> {
  const all = await getAdvanceBalances();
  return all[employeeId]?.balance ?? 0;
}
