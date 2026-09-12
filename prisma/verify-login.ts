import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Reproduz o login do sistema direto no banco, SEM passar pela API (portanto
 * sem o limite de tentativas). Diz exatamente onde o login falharia.
 *
 * Uso:
 *   DEV_EMAIL=dev@contecnica.net DEV_PASSWORD='@Vs02012011' npx tsx prisma/verify-login.ts
 */
const prisma = new PrismaClient();

async function main() {
  const emailRaw = process.env.DEV_EMAIL ?? "";
  const password = process.env.DEV_PASSWORD ?? "";
  if (!emailRaw || !password) {
    console.error("Informe DEV_EMAIL e DEV_PASSWORD.");
    process.exit(1);
  }

  // O login busca pelo email exatamente como enviado. Testamos os dois jeitos
  // para revelar se a diferença é maiúsculas/minúsculas.
  const exato = await prisma.user.findUnique({ where: { email: emailRaw } });
  const minus = await prisma.user.findUnique({ where: { email: emailRaw.toLowerCase() } });

  console.log(`\nE-mail informado: "${emailRaw}"  (${password.length} caracteres na senha)\n`);

  console.log(`Usuário com o e-mail EXATO como digitado: ${exato ? "encontrado" : "NÃO encontrado"}`);
  if (!exato && minus) {
    console.log(`  ⚠️  Mas existe com o e-mail em minúsculas: "${minus.email}"`);
    console.log("      O login diferencia maiúsculas/minúsculas — digite igual ao cadastrado.");
  }

  const user = exato ?? minus;
  if (!user) {
    console.log("\n=> Nenhum usuário com esse e-mail. Confira em prisma/list-users.ts.\n");
    return;
  }

  console.log(`Ativo (isActive): ${user.isActive ? "SIM" : "NÃO — login bloqueado até reativar"}`);
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`Senha confere com o hash no banco: ${ok ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n=> Conclusão:");
  if (exato && user.isActive && ok) {
    console.log("   Usuário, senha e estado estão corretos NO BANCO.");
    console.log("   Se o navegador ainda recusa, é limite de tentativas (5/15min por IP):");
    console.log("   espere ~15 min OU reinicie o app (pm2 restart contecnica) para zerar o contador,");
    console.log("   e tente de novo. Verifique também se não há espaço antes/depois no campo.\n");
  } else {
    console.log("   O login falharia aqui pelo motivo marcado acima.\n");
  }
}

main()
  .catch((e) => {
    console.error("Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
