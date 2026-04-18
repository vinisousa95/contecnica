import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpando dados...");

  await prisma.$executeRawUnsafe(`DELETE FROM project_tasks`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM project_documents`);
  await prisma.$executeRawUnsafe(`DELETE FROM project_photos`);
  await prisma.$executeRawUnsafe(`DELETE FROM project_updates`);
  await prisma.$executeRawUnsafe(`DELETE FROM app_submissions`);
  await prisma.$executeRawUnsafe(`DELETE FROM expenses`);
  await prisma.$executeRawUnsafe(`DELETE FROM revenues`);
  await prisma.$executeRawUnsafe(`DELETE FROM projects`);
  await prisma.$executeRawUnsafe(`DELETE FROM budget_extra_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM budget_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM budgets`);
  await prisma.$executeRawUnsafe(`DELETE FROM client_users`);
  await prisma.$executeRawUnsafe(`DELETE FROM clients`);

  console.log("Dados removidos com sucesso.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
