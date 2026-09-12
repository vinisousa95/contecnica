import { PrismaClient } from "@prisma/client";

/**
 * Lista os usuários do sistema (admin/gestor/funcionário) com o estado de cada
 * um — inclusive se está ATIVO ou INATIVO. Somente leitura, não altera nada.
 *
 * Uso (no servidor):
 *   cd /root/contecnica && npx tsx prisma/list-users.ts
 */
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log("Nenhum usuário cadastrado.");
    return;
  }

  console.log(`\n${users.length} usuário(s):\n`);
  for (const u of users) {
    const estado = u.isActive ? "ATIVO" : "INATIVO";
    console.log(`  ${estado.padEnd(8)} ${u.role.padEnd(9)} ${u.email}   (${u.name})`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error("Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
