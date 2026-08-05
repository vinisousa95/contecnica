# Pagamento das cobranças com Mercado Pago (Checkout Pro)

Na tela **Cobranças** do portal, o cliente vê um botão "Pagar R$ X" com o total
pendente. Ele é levado ao checkout do Mercado Pago, onde escolhe PIX, boleto,
cartão ou saldo. Quando o pagamento é confirmado, os materiais e serviços extras
saem da lista de pendentes automaticamente.

## Como a confiança funciona (leia antes de mexer)

O sistema **nunca** dá baixa com base no que o navegador do cliente informa, nem
no conteúdo da notificação recebida. A sequência é:

1. O cliente clica em pagar. O **valor é calculado no servidor** a partir dos
   itens pendentes — o navegador não envia valor nenhum.
2. Guardamos uma "foto" de quais itens estão sendo cobrados.
3. O Mercado Pago notifica que o pagamento X mudou.
4. Nós consultamos `GET /v1/payments/X` **com o nosso access token** e agimos só
   com base nessa resposta.
5. Conferimos se o valor pago bate com o cobrado. Se não bater, não há baixa.
6. Só então os itens daquela foto são marcados como pagos.

Consequência prática: uma notificação forjada, na pior hipótese, provoca uma
consulta que devolve "não aprovado". A página de retorno é apenas informativa.

## 1. Pegar as credenciais

No [painel de desenvolvedores](https://www.mercadopago.com.br/developers) →
**Suas integrações** → crie uma aplicação (tipo: Checkout Pro / pagamentos
online) → **Credenciais de produção**.

Copie o **Access Token** (começa com `APP_USR-`). É segredo: fica só no servidor,
nunca no frontend.

> Se as credenciais de produção estiverem bloqueadas, é porque o Mercado Pago
> exige os dados da conta completos. Resolva isso primeiro no painel.

## 2. Configurar a notificação (webhook)

Na mesma aplicação → **Webhooks** → *Configurar notificações*:

- **URL de produção:** `https://sistema.contecnica.net/api/webhooks/mercadopago`
- **Eventos:** marque **Pagamentos**
- Salve e **copie a chave secreta** que o MP gera. É com ela que validamos a
  assinatura das notificações.

## 3. Configurar o servidor

No `.env` (`/root/contecnica/.env`):

```env
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
MERCADOPAGO_WEBHOOK_SECRET="a-chave-secreta-do-webhook"

# Precisa ser a URL pública real: dela saem as back_urls e a notification_url
# enviadas ao Mercado Pago.
NEXT_PUBLIC_APP_URL="https://sistema.contecnica.net"
```

Aplique o schema e reinicie:

```bash
cd /root/contecnica
npx prisma db push
pm2 stop contecnica && rm -rf .next && npm run build && pm2 start contecnica
```

## 4. Conferir

Endpoint de diagnóstico (só ADMIN) — mostra se está configurado, a URL do
webhook, as últimas notificações **com o resultado da validação de assinatura**,
e os últimos pagamentos:

```bash
curl -s https://sistema.contecnica.net/api/v1/payments/status \
  -H "Cookie: contecnica_session=SEU_TOKEN" | python3 -m json.tool
```

No painel do Mercado Pago existe um botão de **simular notificação**. Use-o e
confira o diagnóstico: `signatureOk` precisa vir `true`.

A simulação manda um id de pagamento inventado (`123456`), então a nota do log vai
ser `Erro: Payment not found` — isso é esperado e não indica problema. O que
interessa é `signatureOk: true`, que prova que a validação de assinatura está
correta. Confirmado em produção em agosto de 2026, com a assinatura secreta do
modo produção.

O template do manifest usado na validação está em `lib/mercadopago.ts`, função
`verifyWebhookSignature`. Se um dia o Mercado Pago mudar o formato, é o único
lugar a ajustar — e o sintoma será `signatureOk: false` com o motivo "assinatura
não confere". A segurança do fluxo não depende dessa validação (a baixa só ocorre
após a consulta à API do MP), mas com ela falhando as notificações são rejeitadas
e a baixa automática não acontece.

Ao configurar o webhook no painel, marque o evento **Pagamentos (legacy)**. Apesar
do nome, é o formato que esta rota entende (`type: "payment"` com `data.id`). O
evento novo "Order (Mercado Pago)" manda outro payload e seria ignorado.

Depois faça um teste real de valor baixo (R$ 1,00 via PIX é o mais rápido) e veja
o item sair da lista de pendentes.

## Como se comporta

- **Sem as variáveis de ambiente**: o portal funciona normalmente, só sem o botão
  de pagar (`paymentEnabled: false`).
- **Boleto/PIX pendente**: o pagamento fica `PENDING`. Nada é baixado até o MP
  confirmar. O cliente vê "em processamento".
- **Cliente clica em pagar duas vezes**: reaproveitamos a cobrança pendente em
  vez de criar outra, desde que os itens e o valor sejam os mesmos.
- **Notificação reenviada**: ignorada quando a cobrança já está aprovada, sem
  baixa em dobro.
- **Valor divergente**: registrado no log e **nenhuma baixa é feita**.

## Onde o dinheiro cai

Na conta Mercado Pago da aplicação. As taxas e o prazo de repasse dependem do
meio de pagamento e do prazo de recebimento escolhido no painel do MP — PIX tem
taxa menor que cartão, e antecipar o recebimento cobra mais. Confira em
*Seu negócio → Custos* no painel.

## Reembolso / cancelamento

Não implementado. Hoje um reembolso precisa ser feito no painel do Mercado Pago,
e a baixa no sistema desfeita manualmente no banco. Se isso for acontecer com
frequência, vale implementar — o webhook já reconhece o status `refunded`, só não
há a reversão dos itens.
