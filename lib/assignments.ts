import { prisma } from "@/lib/prisma";

/**
 * Cria a despesa de diária de um agendamento que ainda não tem — usando o valor
 * de diária ATUAL do funcionário.
 *
 * A diária normalmente nasce junto do agendamento (ver app/api/v1/assignments),
 * mas só se o funcionário já tiver `dailyRate` na hora. Quando o valor é
 * cadastrado depois, o agendamento fica "Sem diária"; esta função é o conserto,
 * disparado pelo botão "Gerar diária" na obra.
 *
 * Idempotente: se o agendamento já tem despesa, não cria outra.
 */
export async function generateDailyExpense(
  assignmentId: string,
  createdById: string
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const a = await prisma.workAssignment.findUnique({
    where: { id: assignmentId },
    include: { employee: { select: { name: true, dailyRate: true } } },
  });
  if (!a) return { ok: false, reason: "Agendamento não encontrado", status: 404 };
  if (a.expenseId) return { ok: false, reason: "Este agendamento já tem diária lançada", status: 409 };

  const rate = a.employee.dailyRate ? Number(a.employee.dailyRate) : 0;
  if (!rate) {
    return {
      ok: false,
      reason: "Cadastre o valor da diária do funcionário antes de gerar a diária.",
      status: 400,
    };
  }

  const laborCategory = await prisma.category.findFirst({
    where: { name: { contains: "Mão de Obra", mode: "insensitive" }, type: { in: ["EXPENSE", "BOTH"] } },
    select: { id: true },
  });

  const expense = await prisma.expense.create({
    data: {
      description: `Diária — ${a.employee.name}`,
      supplier: a.employee.name,
      amount: rate,
      dueDate: a.date,
      status: "PENDING",
      projectId: a.projectId,
      categoryId: laborCategory?.id ?? null,
      createdById,
    },
  });

  // @unique em expenseId garante que dois cliques simultâneos não criem duas
  // despesas para o mesmo agendamento — o segundo update falha.
  await prisma.workAssignment.update({ where: { id: a.id }, data: { expenseId: expense.id } });

  return { ok: true };
}
