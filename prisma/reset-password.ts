import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@contecnica.com.br";
  const newPassword = "admin123";

  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const created = await prisma.user.create({
      data: {
        name: "Administrador",
        email,
        passwordHash: hash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("✅ Usuário criado:", created.email);
  } else {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, isActive: true },
    });
    console.log("✅ Senha redefinida para:", email);
  }

  console.log("🔑 Senha: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
