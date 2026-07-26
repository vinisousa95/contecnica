/**
 * Normalização de telefone brasileiro para o formato que o WhatsApp espera.
 *
 * `Employee.phone` é texto livre — vem como "(11) 98765-4321", "11 98765 4321",
 * "+55 11 98765-4321" etc. A Evolution API espera só dígitos com DDI:
 * "5511987654321".
 *
 * Regras aplicadas:
 *   - remove tudo que não é dígito;
 *   - remove o "0" de operadora no início (ex.: 011...);
 *   - acrescenta o DDI 55 quando ausente;
 *   - acrescenta o nono dígito em celular antigo de 8 dígitos (o bloco começa
 *     com 6, 7, 8 ou 9), que é o caso da maioria dos cadastros velhos;
 *   - rejeita o que não fecha em telefone brasileiro plausível.
 */

export type PhoneResult =
  | { ok: true; e164: string; national: string; ddd: string; isMobile: boolean }
  | { ok: false; reason: string };

/** DDDs válidos no Brasil (11–99, com faixas inexistentes removidas). */
const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function normalizeBrazilPhone(raw: string | null | undefined): PhoneResult {
  if (!raw || !raw.trim()) return { ok: false, reason: "Telefone não cadastrado" };

  let digits = raw.replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "Telefone sem dígitos" };

  // Prefixo internacional escrito como 0055
  if (digits.startsWith("00")) digits = digits.slice(2);

  // "0" de seleção de operadora (011 98765-4321). Precisa vir ANTES da checagem
  // de comprimento, senão "011987654321" (12 dígitos) é descartado como lixo.
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");

  // DDI já presente? 55 + 10 ou 11 dígitos nacionais.
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  } else if (digits.length > 11) {
    // Comprimento estranho: pode ser DDI de outro país ou lixo no cadastro.
    return { ok: false, reason: `Telefone com ${digits.length} dígitos não reconhecido` };
  }

  if (digits.length < 10) {
    return { ok: false, reason: "Telefone incompleto — informe com DDD" };
  }

  const ddd = digits.slice(0, 2);
  let subscriber = digits.slice(2);

  if (!VALID_DDD.has(Number(ddd))) {
    return { ok: false, reason: `DDD ${ddd} inválido` };
  }

  // Celular antigo de 8 dígitos: acrescenta o nono dígito.
  if (subscriber.length === 8 && /^[6-9]/.test(subscriber)) {
    subscriber = "9" + subscriber;
  }

  if (subscriber.length !== 8 && subscriber.length !== 9) {
    return { ok: false, reason: "Número com quantidade de dígitos inválida" };
  }

  // Celular brasileiro: 9 dígitos começando com 9.
  const isMobile = subscriber.length === 9 && subscriber.startsWith("9");

  if (!isMobile) {
    // 8 dígitos começando com 2–5 é fixo. 9 dígitos que não começam com 9 não
    // é número brasileiro válido (costuma ser telefone de outro país).
    const reason =
      subscriber.length === 8
        ? "Parece telefone fixo — o WhatsApp precisa de um celular"
        : "Não parece um celular brasileiro válido";
    return { ok: false, reason };
  }

  const national = ddd + subscriber;
  return { ok: true, e164: "55" + national, national, ddd, isMobile };
}

/** Formata para exibição: (11) 98765-4321 */
export function formatBrazilPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}
