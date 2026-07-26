import { API_BASE_URL } from "./config";
import { getMemoryToken } from "./token";

export interface ReceiptData {
  supplier: string;
  totalAmount: number;
  items: string;
  date: string | null;
}

/**
 * Lê uma nota fiscal via IA.
 *
 * A chamada à Anthropic acontece no BACKEND (/api/v1/scan-receipt), autenticada
 * com a sessão do usuário. A chave da API nunca é embutida neste app — em Expo,
 * qualquer variável EXPO_PUBLIC_* vai para o bundle e pode ser extraída do APK.
 */
export async function scanReceipt(imageUri: string): Promise<ReceiptData> {
  // Lazy import to avoid native module init issues
  const FileSystem = await import("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const token = getMemoryToken();

  const response = await fetch(`${API_BASE_URL}/api/v1/scan-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.error ?? "Erro ao analisar nota fiscal.");
  }

  const data = json?.data ?? json;
  return {
    supplier: data?.supplier ?? "",
    totalAmount: Number(data?.totalAmount) || 0,
    items: data?.items ?? "",
    date: data?.date ?? null,
  };
}
