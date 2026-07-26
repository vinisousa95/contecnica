/**
 * Textos das mensagens de WhatsApp.
 *
 * Mantidos aqui, separados do envio, para dar para ajustar a redação sem mexer
 * na integração — e para poderem ser testados sem rede.
 */

export interface AssignmentMessageData {
  employeeName: string;
  projectName: string;
  date: Date | string;
  departureTime?: string | null;
  returnTime?: string | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  notes?: string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // Fuso de São Paulo: sem isso, uma data salva à meia-noite UTC aparece como
  // o dia anterior para quem lê a mensagem.
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function fmtWeekday(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtAddress(a: AssignmentMessageData["address"]): string | null {
  if (!a) return null;
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  const line2 = [a.neighborhood, [a.city, a.state].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" - ");
  const full = [line1, line2].filter(Boolean).join(" - ");
  return full || null;
}

/** Primeiro nome, para a saudação não ficar formal demais. */
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

/** Aviso de novo deslocamento. */
export function assignmentCreatedMessage(d: AssignmentMessageData): string {
  const lines: string[] = [];

  lines.push(`Olá, ${firstName(d.employeeName)}! Você foi escalado para um novo serviço.`);
  lines.push("");
  lines.push(`📅 *${fmtWeekday(d.date)}, ${fmtDate(d.date)}*`);
  lines.push(`🏗️ Obra: *${d.projectName}*`);

  const address = fmtAddress(d.address);
  if (address) lines.push(`📍 ${address}`);

  if (d.departureTime) {
    lines.push(`🕐 Saída: *${d.departureTime}*${d.returnTime ? ` — Retorno previsto: ${d.returnTime}` : ""}`);
  }

  if (d.vehicleName) {
    lines.push(`🚐 Veículo: ${d.vehicleName}${d.vehiclePlate ? ` (${d.vehiclePlate})` : ""}`);
  }

  if (d.notes?.trim()) {
    lines.push("");
    lines.push(`📝 Observações: ${d.notes.trim()}`);
  }

  lines.push("");
  lines.push("_Contécnica — Construções e Reformas_");

  return lines.join("\n");
}

/** Aviso de alteração em um deslocamento já comunicado. */
export function assignmentUpdatedMessage(d: AssignmentMessageData): string {
  return assignmentCreatedMessage(d).replace(
    /^Olá, (.+?)! Você foi escalado para um novo serviço\./,
    "Olá, $1! Houve uma *alteração* no seu serviço."
  );
}

/** Aviso de cancelamento. */
export function assignmentCancelledMessage(d: AssignmentMessageData): string {
  return [
    `Olá, ${firstName(d.employeeName)}! Seu serviço foi *cancelado*.`,
    "",
    `📅 ${fmtWeekday(d.date)}, ${fmtDate(d.date)}`,
    `🏗️ Obra: ${d.projectName}`,
    "",
    "Não é necessário comparecer. Qualquer dúvida, fale com o encarregado.",
    "",
    "_Contécnica — Construções e Reformas_",
  ].join("\n");
}
