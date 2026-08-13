import { prisma } from "@/lib/prisma";

/**
 * Itens pendentes de pagamento de um cliente.
 *
 * Fonte única: a tela de Cobranças e a criação da cobrança no gateway usam esta
 * mesma função. Se cada uma calculasse por conta, o valor exibido poderia
 * divergir do valor cobrado.
 *
 * O valor NUNCA vem do cliente — é sempre recalculado aqui a partir do banco.
 */

export type PendingType = "material" | "extra_service";

export interface PendingItem {
  id: string;
  type: PendingType;
  description: string;
  category: string;
  projectId: string | null;
  projectName: string | null;
  amount: number;
  dueDate: Date;
  attachmentUrl: string | null;
  isOverdue: boolean;
}

/**
 * Grupo de cobrança. Cada um paga por formas diferentes no Mercado Pago:
 * materiais só por PIX, serviços por cartão/débito/PIX. Ver a rota de checkout.
 */
export type BillingGroup = "materials" | "services";

export function groupOf(type: PendingType): BillingGroup {
  return type === "material" ? "materials" : "services";
}

export async function getPendingForClient(
  clientId: string,
  group?: BillingGroup
): Promise<{
  pending: PendingItem[];
  totalPending: number;
}> {
  const projects = await prisma.project.findMany({
    where: { clientId },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  if (projectIds.length === 0) return { pending: [], totalPending: 0 };

  // Materiais a reembolsar: só os enviados de propósito na aba "Reembolso de
  // Materiais" da obra.
  //
  // O critério anterior era `category.name contains "material"`, o que errava
  // nos dois sentidos: cobrava do cliente todo material lançado, sem ninguém
  // decidir, e deixava de cobrar material cuja categoria tinha outro nome
  // ("Insumos", "Compras"). Agora o envio é explícito.
  //
  // `status` do Expense é o pagamento ao FORNECEDOR; quem diz se o cliente já
  // reembolsou é `clientPaid`.
  const expenses = await prisma.expense.findMany({
    where: {
      projectId: { in: projectIds },
      billedToClient: true,
      clientPaid: false,
    },
    include: { category: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  // Serviços extras aprovados pelo cliente e ainda não pagos.
  const extraServices = await prisma.extraService.findMany({
    where: { projectId: { in: projectIds }, status: "ACCEPTED", paidAt: null },
    orderBy: { acceptedAt: "asc" },
  });

  const now = new Date();

  const pending: PendingItem[] = [
    ...expenses.map((e) => ({
      id: e.id,
      type: "material" as const,
      description: e.description,
      category: e.category?.name ?? "Material",
      projectId: e.projectId,
      projectName: e.projectId ? projectMap[e.projectId] ?? null : null,
      amount: Number(e.amount),
      dueDate: e.dueDate,
      // A nota só vai para o portal quando liberada. O acesso ao arquivo é
      // barrado do mesmo jeito na rota que serve uploads — omitir a URL aqui
      // esconde o link, não protege o arquivo.
      attachmentUrl: e.receiptShared ? e.attachmentUrl ?? null : null,
      isOverdue: new Date(e.dueDate) < now,
    })),
    ...extraServices.map((s) => ({
      id: s.id,
      type: "extra_service" as const,
      description: s.name,
      category: "Serviço Extra",
      projectId: s.projectId,
      projectName: projectMap[s.projectId] ?? null,
      amount: Number(s.amount),
      dueDate: s.acceptedAt ?? s.createdAt,
      attachmentUrl: null,
      isOverdue: false,
    })),
  ]
    .filter((i) => !group || groupOf(i.type) === group)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Arredonda em centavos: o gateway rejeita valores com mais casas.
  const totalPending = Math.round(pending.reduce((s, i) => s + i.amount, 0) * 100) / 100;

  return { pending, totalPending };
}

/** Formato guardado em Payment.items — o que estava sendo cobrado. */
export interface PaymentItemSnapshot {
  type: PendingType;
  id: string;
  amount: number;
}

export function toSnapshot(pending: PendingItem[]): PaymentItemSnapshot[] {
  return pending.map((p) => ({ type: p.type, id: p.id, amount: p.amount }));
}

/**
 * Chave canônica de um snapshot, para comparar duas cobranças com segurança.
 *
 * Não dá para comparar `JSON.stringify(a) === JSON.stringify(b)`: o Postgres
 * guarda os itens como JSONB e reordena as chaves na leitura, então o JSON lido
 * do banco nunca bate com o JSON recém-montado. Aqui ordenamos os itens por id e
 * montamos uma string estável, indiferente à ordem das chaves.
 */
export function snapshotKey(items: PaymentItemSnapshot[] | null | undefined): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((i) => `${i.type}:${i.id}:${Number(i.amount).toFixed(2)}`)
    .sort()
    .join("|");
}
