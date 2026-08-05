/**
 * Compatibilidade única, para rodar no deploy que introduz `billedToClient`.
 *
 * Antes, o portal cobrava do cliente toda despesa cuja CATEGORIA tivesse
 * "material" no nome, sem ninguém decidir. Agora o envio é explícito. Sem este
 * backfill, materiais que o cliente já estava vendo em Cobranças sumiriam da
 * tela dele no momento do deploy.
 *
 * Marca como enviado exatamente o que o critério antigo pegava — nada além.
 * A nota fiscal NÃO é liberada: isso passa a ser decisão de quem lança, na aba
 * "Reembolso de Materiais" da obra.
 *
 * Rodar:
 *   cd /root/contecnica && npx tsx prisma/backfill-billed-materials.ts
 *
 * É idempotente: rodar de novo não muda nada, porque só toca em despesas com
 * billedToClient = false.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const criterioAntigo = {
    projectId: { not: null },
    category: { name: { contains: "material", mode: "insensitive" as const } },
    clientPaid: false,
    billedToClient: false,
  };

  const alvo = await prisma.expense.findMany({
    where: criterioAntigo,
    select: { id: true, description: true, amount: true, project: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  if (alvo.length === 0) {
    console.log("Nada a migrar: nenhuma despesa se encaixava no critério antigo.");
    console.log("Os materiais passam a ir para cobrança só quando enviados na aba da obra.");
    return;
  }

  console.log(`${alvo.length} despesa(s) que o cliente já via em Cobranças:\n`);
  for (const e of alvo) {
    console.log(`  · ${e.project?.name ?? "sem obra"} — ${e.description} — R$ ${Number(e.amount).toFixed(2)}`);
  }

  const { count } = await prisma.expense.updateMany({
    where: criterioAntigo,
    data: { billedToClient: true, billedToClientAt: new Date() },
  });

  const total = alvo.reduce((s, e) => s + Number(e.amount), 0);
  console.log(`\n${count} marcada(s) como enviada(s) para cobrança. Total: R$ ${total.toFixed(2)}`);
  console.log("Nota fiscal não foi liberada em nenhuma — libere caso a caso na aba da obra.");
}

main()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
