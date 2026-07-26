import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Remove uma conta de desenvolvimento.
 *
 * Uso:
 *   DEV_EMAIL=dev@contecnica.net npx tsx prisma/delete-dev-user.ts
 *
 * Se a conta tiver registros vinculados (despesas, orçamentos, contratos), a
 * exclusão física falha por restrição de chave estrangeira — nesse caso a conta
 * é desativada e as sessões são revogadas, o que já bloqueia o acesso.
 */
async function main() {
  const email = process.env.DEV_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("❌ Defina DEV_EMAIL. Ex.: DEV_EMAIL=dev@contecnica.net npx tsx prisma/delete-dev-user.ts");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) {
    console.log(`ℹ️  Nenhum usuário com o e-mail ${email}.`);
    return;
  }

  try {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`✅ Usuário ${user.email} excluído.`);
  } catch {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    console.log(`✅ Usuário ${user.email} tem registros vinculados, então foi DESATIVADO`);
    console.log("   e as sessões dele foram revogadas — o acesso está bloqueado.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
