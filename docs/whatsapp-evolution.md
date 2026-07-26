# Avisos de deslocamento por WhatsApp (Evolution API)

Quando um deslocamento é criado, o funcionário recebe uma mensagem no WhatsApp
com data, obra, endereço, horário de saída e veículo.

## Antes de começar — leia isto

A Evolution API conversa pelo protocolo do **WhatsApp Web** (Baileys por baixo),
que **não é oficial**. Consequências práticas:

- **Use um chip dedicado.** Não use o número principal da Contécnica. Se a Meta
  banir, você perde aquele número — não o da empresa.
- **Não faça disparo em massa.** Avisos operacionais para a própria equipe têm
  volume baixo e padrão natural; listas grandes chamam atenção.
- O celular com o chip precisa manter a sessão ativa (é como o WhatsApp Web).

A alternativa oficial é a WhatsApp Cloud API da Meta: sem risco de ban, mas exige
negócio verificado, número dedicado, template aprovado e custo por mensagem.

## 1. Subir a Evolution API no servidor

Ela roda em Docker, ao lado do sistema. Como só o sistema vai conversar com ela,
**publique a porta apenas em 127.0.0.1** — assim a Evolution não fica exposta na
internet.

```bash
# Docker, se ainda não houver
apt update && apt install -y docker.io docker-compose-v2

mkdir -p /root/evolution && cd /root/evolution
```

Crie `/root/evolution/docker-compose.yml`:

```yaml
services:
  evolution:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution
    restart: always
    # 127.0.0.1: acessível só de dentro do servidor
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      # Troque por uma chave forte: é a senha da API
      AUTHENTICATION_API_KEY: "COLOQUE_UMA_CHAVE_FORTE_AQUI"
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: "postgresql"
      DATABASE_CONNECTION_URI: "postgresql://evolution:SENHA_DO_BANCO@postgres:5432/evolution"
      DATABASE_SAVE_DATA_INSTANCE: "true"
      CACHE_REDIS_ENABLED: "false"
      CACHE_LOCAL_ENABLED: "true"
      LOG_LEVEL: "ERROR"
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    container_name: evolution-db
    restart: always
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: SENHA_DO_BANCO
      POSTGRES_DB: evolution
    volumes:
      - evolution_db:/var/lib/postgresql/data

volumes:
  evolution_instances:
  evolution_db:
```

Gere a chave e suba:

```bash
openssl rand -hex 24        # use a saída como AUTHENTICATION_API_KEY
docker compose up -d
docker compose logs -f evolution   # Ctrl+C para sair
```

Confira que respondeu:

```bash
curl -s http://127.0.0.1:8080 | head -5
```

## 2. Criar a instância e conectar o chip

```bash
API_KEY="a-chave-que-você-gerou"

curl -X POST http://127.0.0.1:8080/instance/create \
  -H "apikey: $API_KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"contecnica","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

A resposta traz o QR code. Para ler com o celular, pegue o QR novamente em
formato de imagem:

```bash
curl -s http://127.0.0.1:8080/instance/connect/contecnica -H "apikey: $API_KEY"
```

O campo `base64` é a imagem do QR. Jeito prático de visualizar: copie o conteúdo
depois de `base64,` e cole em `data:image/png;base64,<conteúdo>` na barra do
navegador. No celular com o chip dedicado: **WhatsApp → Dispositivos conectados
→ Conectar dispositivo** e aponte para o QR.

Confirme a conexão:

```bash
curl -s http://127.0.0.1:8080/instance/connectionState/contecnica -H "apikey: $API_KEY"
# esperado: {"instance":{"state":"open"}}
```

`state: "open"` = conectado.

## 3. Apontar o sistema para a Evolution

No `.env` do sistema (`/root/contecnica/.env`):

```env
EVOLUTION_API_URL="http://127.0.0.1:8080"
EVOLUTION_API_KEY="a-chave-que-você-gerou"
EVOLUTION_INSTANCE="contecnica"
```

Aplique o schema (novos campos) e reinicie:

```bash
cd /root/contecnica
npx prisma db push
npm run build && pm2 restart contecnica
```

## 4. Conferir

Endpoint de diagnóstico (só ADMIN) — mostra se está configurado, se a instância
está conectada e os últimos 20 envios com o motivo de cada falha:

```bash
curl -s http://127.0.0.1:3000/api/v1/whatsapp/status \
  -H "Cookie: contecnica_session=SEU_TOKEN" | python3 -m json.tool
```

Depois crie um deslocamento de teste para você mesmo e veja se a mensagem chega.

## Como se comporta

- **Sem as variáveis de ambiente**: o sistema funciona normalmente. O aviso é
  registrado como `SKIPPED` no log, sem erro na tela.
- **Falha no envio** (Evolution fora do ar, número inválido, sessão caída): o
  deslocamento **é criado normalmente**. A falha vai para o log com o motivo.
  A notificação nunca derruba a operação.
- **Funcionário sem telefone, ou com telefone fixo**: `SKIPPED` com o motivo.
- **Funcionário que não quer receber**: desmarque `whatsappEnabled` no cadastro
  dele.

## Telefones

O sistema normaliza sozinho o que está cadastrado: aceita `(11) 98765-4321`,
`11987654321`, `+55 11 98765-4321`, `011987654321`, e acrescenta o nono dígito
em celulares antigos de 8 dígitos. Telefone fixo é recusado com aviso claro,
porque não tem WhatsApp.

Para achar cadastros que vão falhar antes de depender disso:

```sql
SELECT name, phone FROM employees
 WHERE phone IS NULL OR length(regexp_replace(phone, '\D', '', 'g')) < 10;
```

## Manutenção

```bash
cd /root/evolution
docker compose logs --tail 50 evolution   # ver erros
docker compose restart evolution          # reiniciar
docker compose pull && docker compose up -d   # atualizar
```

Se a sessão cair (celular desligado muito tempo, WhatsApp desconectado no
aparelho), repita o passo 2 para ler o QR novamente.
