import * as FileSystem from "expo-file-system";
import { ANTHROPIC_API_KEY } from "./config";

export interface ReceiptData {
  supplier: string;
  totalAmount: number;
  items: string;
  date: string | null;
}

export async function scanReceipt(imageUri: string): Promise<ReceiptData> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Chave da API Anthropic não configurada. Adicione EXPO_PUBLIC_ANTHROPIC_KEY no .env");
  }

  // Convert image to base64
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
              text: `Analise esta nota fiscal/cupom fiscal e extraia as informações. Responda SOMENTE com JSON válido neste formato:
{
  "supplier": "nome do fornecedor/loja",
  "totalAmount": 0.00,
  "items": "descrição resumida dos materiais adquiridos",
  "date": "DD/MM/AAAA ou null se não encontrar"
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Erro ao analisar nota fiscal. Verifique sua chave Anthropic.");
  }

  const result = await response.json();
  const text = result.content[0]?.text ?? "{}";

  // Extract JSON from response
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
