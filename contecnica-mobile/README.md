# Contécnica Mobile

App para responsáveis de obra — envio de fotos, reembolso de material e execução de tarefas.

## Como testar no iPhone (Expo Go)

1. Instale o **Expo Go** na App Store do iPhone
2. No computador, dentro desta pasta:

```bash
npm install
cp .env.example .env
# Edite o .env com a URL do backend e chave Anthropic

npx expo start
```

3. Escaneie o QR code com a câmera do iPhone → abre no Expo Go

## Estrutura

| Tela | Função |
|---|---|
| Login | Autenticação com conta do sistema |
| Fotos | Selecionar obra + item + enviar foto |
| Reembolso | Fotografar nota fiscal → IA preenche os dados |
| Tarefas | Selecionar obra + marcar tarefas concluídas |

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

- `EXPO_PUBLIC_API_URL` — URL do backend (ex: `https://app.contecnica.com.br`)
- `EXPO_PUBLIC_ANTHROPIC_KEY` — Chave da API Anthropic para leitura de NF com IA
  - Crie uma conta em https://console.anthropic.com
  - Gere uma API key em "API Keys"
