import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

/**
 * Cria (ou atualiza) um usuário de desenvolvimento.
 *
 * Uso:
 *   DEV_EMAIL=dev@contecnica.net DEV_PASSWORD='SenhaForte123' npx tsx prisma/create-dev-user.ts
 *
 * Sem DEV_PASSWORD, gera uma senha aleatória forte e a imprime uma única vez.
 * Variáveis opcionais: DEV_NAME, DEV_ROLE (ADMIN | MANAGER | EMPLOYEE).
 *
 * A senha é gravada com bcrypt custo 12 — nunca em texto puro. `tokenVersion`
 * é incrementado ao atualizar, para derrubar sessões antigas dessa conta.
 */

const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;
type Role = (typeof ROLES)[number];

/** Senha aleatória legível para digitar, com entropia suficiente (~95 bits). */
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const email = (process.env.DEV_EMAIL ?? "dev@contecnica.net").trim().toLowerCase();
  const name = process.env.DEV_NAME ?? "Desenvolvimento";
  const role = (process.env.DEV_ROLE ?? "ADMIN") as Role;

  if (!ROLES.includes(role)) {
    console.error(`❌ DEV_ROLE inválido: "${role}". Use um de: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const provided = process.env.DEV_PASSWORD;
  if (provided && provided.length < 8) {
    console.error("❌ DEV_PASSWORD deve ter ao menos 8 caracteres (o login exige isso).");
    process.exit(1);
  }

  const password = provided ?? generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          name,
          role,
          passwordHash,
          isActive: true,
          // Derruba sessões antigas dessa conta (ver lib/session.ts).
          tokenVersion: { increment: 1 },
        },
        select: { id: true, email: true, name: true, role: true },
      })
    : await prisma.user.create({
        data: { name, email, passwordHash, role, isActive: true },
        select: { id: true, email: true, name: true, role: true },
      });

  console.log(`\n✅ Usuário de desenvolvimento ${existing ? "atualizado" : "criado"}:\n`);
  console.log(`   E-mail: ${user.email}`);
  console.log(`   Senha:  ${password}${provided ? "" : "   ← gerada agora, anote: não será exibida de novo"}`);
  console.log(`   Perfil: ${user.role}`);
  console.log(`   ID:     ${user.id}\n`);

  if (!provided) {
    console.log("   Guarde a senha em um gerenciador. Para trocá-la depois:");
    console.log(`   DEV_EMAIL=${user.email} DEV_PASSWORD='NovaSenha' npx tsx prisma/create-dev-user.ts\n`);
  }
  console.log("   Para remover esta conta quando não precisar mais:");
  console.log(`   DEV_EMAIL=${user.email} npx tsx prisma/delete-dev-user.ts\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
