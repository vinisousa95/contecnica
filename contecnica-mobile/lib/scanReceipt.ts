import { ANTHROPIC_API_KEY } from "./config";

export interface ReceiptData {
  supplier: string;
  totalAmount: number;
  items: string;
  date: string | null;
}

export async function scanReceipt(imageUri: string): Promise<ReceiptData> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Chave Anthropic não configurada. Adicione EXPO_PUBLIC_ANTHROPIC_KEY no .env");
  }

  // Lazy import to avoid native module init issues
  const FileSystem = await import("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            {
              type: "text",
              text: `Analise esta nota fiscal e extraia as informações. Responda SOMENTE com JSON:
{
  "supplier": "nome do fornecedor",
  "totalAmount": 0.00,
  "items": "descrição dos materiais",
  "date": "DD/MM/AAAA ou null"
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Erro ao analisar nota fiscal. Verifique a chave Anthropic.");
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Não foi possível extrair dados da nota fiscal");

  const data = JSON.parse(match[0]);
  return {
    supplier: data.supplier ?? "",
    totalAmount: Number(data.totalAmount) || 0,
    items: data.items ?? "",
    date: data.date ?? null,
  };
}
