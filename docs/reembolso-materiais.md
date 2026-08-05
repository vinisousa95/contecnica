# Reembolso de materiais para o cliente

Materiais comprados para a obra podem ser cobrados do cliente junto com os
serviços extras. O envio é **decisão explícita**, feita na obra.

## Como usar

Abra a obra (**Obras → a obra**) e desça até **Reembolso de Materiais**. A seção
lista as despesas lançadas naquela obra, com a situação de cada uma:

| Situação | O que significa |
|---|---|
| **Não enviada** | O cliente não vê. É o estado inicial de toda despesa. |
| **Aguardando pagamento** | Está em Cobranças no portal, esperando o cliente pagar. |
| **Reembolsada** | O cliente pagou. Sai da lista de pendentes dele. |

Marque as despesas e use os botões que aparecem:

- **Enviar para cobrança** — passa a aparecer em Cobranças no portal.
- **Enviar nota ao cliente** — libera a nota fiscal anexada. Decisão separada:
  enviar o valor não expõe o anexo.
- **Recolher nota** — o cliente deixa de ver a nota, o valor continua cobrado.
- **Retirar da cobrança** — sai de Cobranças. Recolhe a nota também, já que ela
  só existia ali para justificar o valor.

Despesa já reembolsada não pode ser alterada por aqui — desfazer um reembolso pago
é correção manual no banco, não operação de rotina.

## Diárias não aparecem

Mão de obra é custo da Contécnica, não do cliente, então as diárias de funcionário
ficam fora da lista — e a API recusa enviá-las mesmo por requisição direta.

O filtro usa o vínculo com o **apontamento** (`WorkAssignment`), que é como a
diária nasce no módulo operacional, e não o nome da categoria. Numa obra com
vários funcionários isso é uma diária por dia por pessoa: sem o filtro, a lista
viraria só diária.

Se uma diária tiver sido enviada para cobrança antes deste filtro existir, ela
continua aparecendo — para poder ser retirada. Esconder algo que está sendo
cobrado seria pior.

## A nota fiscal

Só aparece para o cliente quando liberada, e o controle não é só visual: a rota
que serve arquivos (`app/api/v1/uploads/[...path]/route.ts`) recusa o download se
a nota não estiver liberada, ou se a despesa for de obra de outro cliente. Sem
isso, esconder o link não protegeria nada — bastaria saber a URL.

Despesa sem anexo não tem o que liberar. Ao tentar, o sistema avisa quantas estão
nessa situação; anexe a nota na despesa primeiro (**Financeiro → Despesas →
editar**).

## Como era antes (e por que mudou)

O portal cobrava do cliente toda despesa cuja **categoria tivesse "material" no
nome**, automaticamente. Isso errava nos dois sentidos:

- material lançado ia para a cobrança do cliente sem ninguém decidir;
- material em categoria com outro nome — "Insumos", "Compras" — nunca chegava lá.

O segundo caso é o motivo mais comum de "os materiais não aparecem em Cobranças".

## Migração (uma vez, no deploy)

Se havia materiais que o cliente já estava vendo em Cobranças pelo critério
antigo, este script marca exatamente esses como enviados, para nada sumir da tela
dele:

```bash
cd /root/contecnica
npx prisma db push          # cria as colunas novas
npx tsx prisma/backfill-billed-materials.ts
```

O script lista o que vai marcar antes de gravar, e é idempotente — rodar duas
vezes não muda nada. Ele **não** libera nenhuma nota fiscal: isso passa a ser
decisão caso a caso.

Se a saída for "Nada a migrar", significa que nenhum material se encaixava no
critério antigo — nada do que o cliente vê hoje muda.

## Onde isso vive no código

| Arquivo | Papel |
|---|---|
| `components/projects/reimbursements-section.tsx` | A seção na obra |
| `app/api/v1/projects/[id]/reimbursements/route.ts` | Listar e enviar/retirar |
| `lib/billing.ts` | Monta os pendentes do cliente (fonte única do valor cobrado) |
| `app/api/v1/uploads/[...path]/route.ts` | Autoriza o download da nota |
| `prisma/schema.prisma` | `Expense.billedToClient`, `billedToClientAt`, `receiptShared` |
