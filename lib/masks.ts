// Input masks — format values as the user types

export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    // Fixed line: (11) 9999-9999
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Mobile: (11) 99999-9999
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// Currency mask — formats as user types: "2005" or 2005 → "2.005,00"
export function formatCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  let num: number;
  if (typeof value === "number") {
    num = value;
  } else {
    const str = String(value);
    if (str.includes(",")) {
      // Already in Brazilian format "2.005,00" — dot = thousands, comma = decimal
      num = parseFloat(str.replace(/\./g, "").replace(",", "."));
    } else {
      // Plain decimal string "2005.00" or "2005" — dot = decimal separator
      num = parseFloat(str);
    }
  }
  if (isNaN(num)) return "";
  const cents = Math.round(num * 100);
  const digits = String(cents).padStart(3, "0");
  const centsStr = digits.slice(-2);
  const intRaw = digits.slice(0, -2).replace(/^0+/, "") || "0";
  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intFormatted},${centsStr}`;
}

// Convert masked currency input back to raw decimal string for API: "26.000,00" → "26000.00"
export function parseCurrencyInput(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toFixed(2);
}

// ── Number to words (Brazilian Portuguese) ────────────────────

const UNITS = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 && rest > 0 ? "cento" : HUNDREDS[h]);
  if (rest < 20 && rest > 0) parts.push(UNITS[rest]);
  else if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10 > 0) parts.push(UNITS[rest % 10]);
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  if (n === 1000) return "mil";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  if (millions > 0) parts.push(`${chunkToWords(millions)} ${millions === 1 ? "milhão" : "milhões"}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mil" : `${chunkToWords(thousands)} mil`);
  if (remainder > 0) parts.push(chunkToWords(remainder));
  return parts.join(" e ");
}

export function numberToWordsBRL(value: number): string {
  if (value < 0) return "";
  const intPart = Math.floor(value);
  const decPart = Math.round((value - intPart) * 100);
  const parts: string[] = [];
  if (intPart > 0) parts.push(`${integerToWords(intPart)} ${intPart === 1 ? "real" : "reais"}`);
  if (decPart > 0) parts.push(`${integerToWords(decPart)} ${decPart === 1 ? "centavo" : "centavos"}`);
  if (parts.length === 0) return "zero reais";
  return parts.join(" e ");
}
