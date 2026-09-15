// Escreve um valor em reais por extenso, em português do Brasil.
// Ex.: 1306.52 → "mil, trezentos e seis reais e cinquenta e dois centavos".
// Usado no recibo, onde o valor por extenso é praxe.

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];
const DEZENAS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta",
  "sessenta", "setenta", "oitenta", "noventa",
];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

// Grupos de 3 dígitos (milhar, milhão, bilhão...) no singular/plural.
const ESCALAS: Array<[string, string]> = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
  ["trilhão", "trilhões"],
];

// Converte um número de 1 a 999 por extenso.
function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

// Inteiro por extenso (0 a 999 bilhões e alguns).
function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";

  // Quebra em grupos de 3 dígitos, do menos para o mais significativo.
  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes: string[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const [sing, plur] = ESCALAS[i] ?? ["", ""];
    const escala = i === 0 ? "" : g === 1 ? sing : plur;
    // "mil" não leva "um" na frente: 1.000 é "mil", não "um mil".
    const texto = i === 1 && g === 1 ? "" : ate999(g);
    partes.push([texto, escala].filter(Boolean).join(" "));
  }

  // Junta os grupos com vírgula, e "e" antes do último quando faz sentido.
  return partes.join(", ");
}

/**
 * Valor monetário por extenso, com reais e centavos.
 * @param valor número em reais (ex.: 1306.52)
 */
export function valorPorExtenso(valor: number): string {
  const arred = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(arred / 100);
  const centavos = arred % 100;

  const parteReais =
    reais === 0 ? "" : `${inteiroExtenso(reais)} ${reais === 1 ? "real" : "reais"}`;
  const parteCentavos =
    centavos === 0 ? "" : `${inteiroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;

  if (parteReais && parteCentavos) return `${parteReais} e ${parteCentavos}`;
  if (parteReais) return parteReais;
  if (parteCentavos) return parteCentavos;
  return "zero real";
}
