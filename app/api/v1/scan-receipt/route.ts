import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/utils";

/**
 * Leitura de nota fiscal por IA — proxy server-side.
 *
 * A chave da Anthropic vive SOMENTE aqui, no servidor (ANTHROPIC_API_KEY).
 * Antes ela era embutida no bundle do app mobile via EXPO_PUBLIC_ANTHROPIC_KEY,
 * de onde qualquer pessoa poderia extraí-la do APK/IPA e gastar na nossa conta.
 */

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Base64 infla ~33%; 8MB de base64 ≈ 6MB de imagem.
const MAX_BASE64_CHARS = 8 * 1024 * 1024;

const requestSchema = z.object({
  imageBase64: z.string().min(1, "Imagem obrigatória"),
  mediaType: z.enum(ALLOWED_MEDIA_TYPES).default("image/jpeg"),
});

/**
 * Formato de saída garantido pela API (structured outputs) — o modelo é obrigado
 * a responder exatamente neste schema, então não é preciso caçar JSON no texto
 * com regex como na versão anterior.
 *
 * JSON Schema puro em vez do helper zod do SDK: o helper exige zod v4 e o
 * projeto usa v3 (que continua sendo usado na validação da entrada acima).
 */
const RECEIPT_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      supplier: { type: "string", description: "Nome do fornecedor/estabelecimento" },
      totalAmount: { type: "number", description: "Valor total da nota em reais" },
      items: { type: "string", description: "Descrição resumida dos materiais/serviços" },
      date: {
        type: ["string", "null"],
        description: "Data da nota no formato DD/MM/AAAA, ou null se ilegível",
      },
    },
    required: ["supplier", "totalAmount", "items", "date"],
    additionalProperties: false,
  },
};

interface ReceiptData {
  supplier?: string;
  totalAmount?: number;
  items?: string;
  date?: string | null;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[scan-receipt] ANTHROPIC_API_KEY não configurada no servidor");
    return apiError("Leitura por IA não configurada no servidor.", 503);
  }

  let parsed;
  try {
    parsed = requestSchema.parse(await request.json());
  } catch {
    return apiError("Dados inválidos: envie imageBase64 e um mediaType suportado.");
  }

  if (parsed.imageBase64.length > MAX_BASE64_CHARS) {
    return apiError("Imagem muito grande. Tire a foto com qualidade menor.", 413);
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { format: RECEIPT_FORMAT },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: parsed.mediaType,
                data: parsed.imageBase64,
              },
            },
            {
              type: "text",
              text:
                "Analise esta nota fiscal brasileira e extraia as informações. " +
                "O valor total deve ser um número (use ponto decimal, sem 'R$' e sem separador de milhar). " +
                "Se algum campo não estiver legível, use string vazia — ou null na data.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return apiError("Não foi possível analisar esta imagem.", 422);
    }
    if (response.stop_reason === "max_tokens") {
      return apiError("A leitura ficou incompleta. Tente uma foto mais nítida.", 422);
    }

    // Com structured outputs o texto já é JSON válido conforme o schema.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return apiError("Não foi possível extrair dados da nota fiscal.", 422);
    }

    let data: ReceiptData;
    try {
      data = JSON.parse(textBlock.text);
    } catch {
      console.error("[scan-receipt] resposta não era JSON válido");
      return apiError("Não foi possível extrair dados da nota fiscal.", 422);
    }

    return apiSuccess({
      supplier: data.supplier ?? "",
      totalAmount: Number(data.totalAmount) || 0,
      items: data.items ?? "",
      date: data.date ?? null,
    });
  } catch (err: any) {
    // Nunca repassar a mensagem crua da Anthropic ao cliente: pode conter
    // detalhes de configuração da conta.
    console.error("[scan-receipt] falha:", err?.status, err?.message);
    if (err instanceof Anthropic.RateLimitError) {
      return apiError("Serviço de leitura ocupado. Tente novamente em instantes.", 429);
    }
    return apiError("Erro ao analisar a nota fiscal. Tente novamente.", 502);
  }
}
