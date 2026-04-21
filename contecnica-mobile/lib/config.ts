// Troque pela URL real do backend quando disponível
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://app.contecnica.com.br";

// Chave da API Anthropic para leitura de notas fiscais
export const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? "";
