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

// Currency mask — formats as user types: "26000" → "26.000,00"
export function formatCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const raw = typeof value === "number" ? value.toFixed(2) : String(value);
  // Handle already-masked values like "26.000,00"
  const clean = raw.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
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
