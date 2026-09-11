/**
 * Compatibilidade única. Materiais reembolsados pelo cliente ANTES desta
 * correção ficaram com `clientPaid = true` mas `status = PENDING`, então
 * apareciam como "Pendente" na lista de Despesas mesmo já pagos.
 *
 * Este script alinha o status: toda despesa reembolsada (clientPaid) que ainda
 * não está PAID passa a PAID, com paymentDate = data do reembolso.
 *
 * Rodar uma vez, no deploy:
 *   cd /root/contecnica && npx tsx prisma/backfill-reimbursed-status.ts
 *
 * Idempotente: rodar de novo não muda nada (só toca em clientPaid=true e
 * status != PAID).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alvo = await prisma.expense.findMany({
    where: { clientPaid: true, status: { not: "PAID" } },
    select: { id: true, description: true, amount: true, clientPaidAt: true },
    orderBy: { clientPaidAt: "asc" },
  });

  if (alvo.length === 0) {
    console.log("Nada a alinhar: nenhum material reembolsado está como Pendente.");
    return;
  }

  console.log(`${alvo.length} despesa(s) reembolsada(s) que estavam como Pendente:\n`);
  for (const e of alvo) {
    console.log(`  · ${e.description} — R$ ${Number(e.amount).toFixed(2)}`);
  }

  let atualizadas = 0;
  for (const e of alvo) {
    await prisma.expense.update({
      where: { id: e.id },
      data: { status: "PAID", paymentDate: e.clientPaidAt ?? new Date() },
    });
    atualizadas++;
  }

  console.log(`\n${atualizadas} despesa(s) marcada(s) como Pago.`);
}

main()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
