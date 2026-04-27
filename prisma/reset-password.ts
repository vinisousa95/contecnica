import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.RESET_EMAIL ?? "admin@contecnica.com.br";
  const newPassword = process.env.RESET_PASSWORD;

  if (!newPassword || newPassword.length < 8) {
    console.error("❌ Defina RESET_PASSWORD (mín. 8 caracteres) como variável de ambiente.");
    console.error("   Exemplo: RESET_PASSWORD=MinhaSenh@Forte npx ts-node prisma/reset-password.ts");
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const created = await prisma.user.create({
      data: { name: "Administrador", email, passwordHash: hash, role: "ADMIN", isActive: true },
    });
    console.log("✅ Usuário criado:", created.email);
  } else {
    await prisma.user.update({ where: { email }, data: { passwordHash: hash, isActive: true } });
    console.log("✅ Senha redefinida para:", email);
  }

  console.log("🔑 Senha definida com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
