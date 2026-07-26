// Troque pela URL real do backend quando disponível
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://app.contecnica.com.br";

// ATENÇÃO: não adicione chaves de API ou segredos neste arquivo.
// Em Expo, toda variável EXPO_PUBLIC_* é embutida no bundle JS e pode ser
// extraída do APK/IPA por qualquer pessoa. Segredos ficam no backend —
// a leitura de notas fiscais por IA usa /api/v1/scan-receipt, que guarda a
// chave da Anthropic no servidor (ANTHROPIC_API_KEY).
