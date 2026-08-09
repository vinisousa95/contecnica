/**
 * Resumo financeiro de uma obra — cálculo único, usado por todas as telas.
 *
 * A distinção que importa aqui: **lançado** não é **realizado**.
 *
 * Uma receita com status PENDING é dinheiro combinado, ainda não recebido; uma
 * despesa PENDING é conta a pagar. Somar as duas coisas num único "total" faz o
 * sistema mostrar lucro de dinheiro que não entrou — foi o que acontecia na
 * margem: a 2ª parcela de uma obra, agendada para o mês seguinte, já aparecia
 * somada como se estivesse na conta.
 *
 * Por isso são dois números, sempre:
 *   - `realizedMargin` — recebido menos pago. É o caixa da obra hoje.
 *   - `projectedMargin` — total menos total. É o resultado se tudo se cumprir.
 *
 * As telas mostram o realizado em destaque e o previsto como contexto.
 */

export interface FinancialItem {
  amount: unknown; // Decimal do Prisma, string ou number
  status: string;
}

export interface ProjectFinancials {
  totalExpenses: number;
  paidExpenses: number;
  pendingExpenses: number;
  totalRevenues: number;
  receivedRevenues: number;
  pendingRevenues: number;
  /** Recebido − pago. O que a obra deu de resultado até agora. */
  realizedMargin: number;
  /** Total − total. O resultado se todo o combinado se cumprir. */
  projectedMargin: number;
}

/**
 * Arredonda em centavos. Somar decimais em ponto flutuante produz sobras
 * (33919.56 − 1496.06 dava 32423.499999999996), que aparecem em comparações e em
 * qualquer lugar que mostre o número cru.
 */
const emCentavos = (v: number) => Math.round(v * 100) / 100;

const soma = (itens: FinancialItem[], statusFiltro?: string) =>
  emCentavos(
    itens.reduce(
      (total, i) => (statusFiltro && i.status !== statusFiltro ? total : total + Number(i.amount)),
      0
    )
  );

export function projectFinancials(
  expenses: FinancialItem[],
  revenues: FinancialItem[]
): ProjectFinancials {
  const totalExpenses = soma(expenses);
  const paidExpenses = soma(expenses, "PAID");
  const totalRevenues = soma(revenues);
  const receivedRevenues = soma(revenues, "RECEIVED");

  return {
    totalExpenses,
    paidExpenses,
    pendingExpenses: emCentavos(totalExpenses - paidExpenses),
    totalRevenues,
    receivedRevenues,
    pendingRevenues: emCentavos(totalRevenues - receivedRevenues),
    realizedMargin: emCentavos(receivedRevenues - paidExpenses),
    projectedMargin: emCentavos(totalRevenues - totalExpenses),
  };
}

/** Margem em % sobre a base informada. Sem base, não há percentual. */
export function marginPercent(margin: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round((margin / base) * 100);
}
