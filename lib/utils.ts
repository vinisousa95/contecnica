import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency ──────────────────────────────────────────────────
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

// ── Dates ─────────────────────────────────────────────────────
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const iso = typeof date === "string" ? date : (date as Date).toISOString();
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Valor para `<input type="date">` (formato `yyyy-MM-dd`).
 *
 * Recorta a data do ISO em UTC, sem converter para o fuso local — é o mesmo
 * critério de `formatDate`, então tela de listagem e formulário sempre mostram
 * o mesmo dia.
 *
 * NÃO use `format(new Date(x), "yyyy-MM-dd")` do date-fns aqui: as datas são
 * gravadas à meia-noite UTC e `format` converte para o fuso local, o que no
 * horário de Brasília (UTC-3) devolve o DIA ANTERIOR. O formulário abria com um
 * dia a menos e, ao salvar, gravava esse dia — a data andava para trás a cada
 * edição.
 */
export function toDateInputValue(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  const iso = typeof date === "string" ? date : (date as Date).toISOString();
  return iso.slice(0, 10);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function isOverdue(dueDate: Date | string): boolean {
  return isBefore(new Date(dueDate), new Date());
}

export function isDueSoon(dueDate: Date | string, days = 7): boolean {
  const due = new Date(dueDate);
  return isAfter(due, new Date()) && isBefore(due, addDays(new Date(), days));
}

// ── Document formatting ───────────────────────────────────────
export function formatDocument(doc: string | null | undefined): string {
  if (!doc) return "—";
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

// ── Status labels ─────────────────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em Andamento",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PAUSED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
};

export const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export const REVENUE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  RECEIVED: "Recebido",
  OVERDUE: "Vencido",
};

export const REVENUE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em Manutenção",
  INACTIVE: "Inativo",
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

export const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

// ── Pagination ────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  return { page, limit, skip: (page - 1) * limit };
}

// ── Service Providers ─────────────────────────────────────────
export const SPECIALTY_LABELS: Record<string, string> = {
  ELECTRICAL: "Elétrica",
  PLUMBING: "Hidráulica",
  PAINTING: "Pintura",
  MASONRY: "Alvenaria",
  FINISHING: "Acabamento",
  DRYWALL: "Drywall/Gesso",
  CARPENTRY: "Marcenaria",
  METALWORK: "Serralheria",
  GLASSWORK: "Vidraçaria",
  CLEANING: "Limpeza",
  TRANSPORT: "Transporte",
  ENGINEERING: "Engenharia",
  ARCHITECTURE: "Arquitetura",
  OTHER: "Outros",
};

export const SPECIALTY_COLORS: Record<string, string> = {
  ELECTRICAL: "bg-yellow-100 text-yellow-700",
  PLUMBING: "bg-blue-100 text-blue-700",
  PAINTING: "bg-purple-100 text-purple-700",
  MASONRY: "bg-stone-100 text-stone-700",
  FINISHING: "bg-pink-100 text-pink-700",
  DRYWALL: "bg-sky-100 text-sky-700",
  CARPENTRY: "bg-amber-100 text-amber-700",
  METALWORK: "bg-violet-100 text-violet-700",
  GLASSWORK: "bg-cyan-100 text-cyan-700",
  CLEANING: "bg-teal-100 text-teal-700",
  TRANSPORT: "bg-indigo-100 text-indigo-700",
  ENGINEERING: "bg-orange-100 text-orange-700",
  ARCHITECTURE: "bg-rose-100 text-rose-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Pessoa Física",
  COMPANY: "Pessoa Jurídica",
};

export const WORK_PROVIDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

export const WORK_PROVIDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-600",
};

// ── API response helpers ───────────────────────────────────────
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return Response.json({ success: true, data, ...meta });
}

export function apiError(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

// ── Personal Expenses ─────────────────────────────────────────
export const PERSONAL_EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Alimentação",
  MARKET: "Mercado",
  TRANSPORT: "Transporte",
  FUEL: "Combustível",
  RENT: "Aluguel",
  FINANCING: "Financiamento",
  CREDIT_CARD: "Cartão de Crédito",
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  LEISURE: "Lazer",
  FAMILY: "Família",
  SUBSCRIPTIONS: "Assinaturas",
  TAXES: "Impostos",
  OTHER: "Outros",
};

export const PERSONAL_EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  FOOD: "bg-orange-100 text-orange-700",
  MARKET: "bg-green-100 text-green-700",
  TRANSPORT: "bg-blue-100 text-blue-700",
  FUEL: "bg-yellow-100 text-yellow-700",
  RENT: "bg-purple-100 text-purple-700",
  FINANCING: "bg-red-100 text-red-700",
  CREDIT_CARD: "bg-pink-100 text-pink-700",
  HEALTH: "bg-teal-100 text-teal-700",
  EDUCATION: "bg-indigo-100 text-indigo-700",
  LEISURE: "bg-cyan-100 text-cyan-700",
  FAMILY: "bg-rose-100 text-rose-700",
  SUBSCRIPTIONS: "bg-violet-100 text-violet-700",
  TAXES: "bg-stone-100 text-stone-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export const PERSONAL_EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
};

export const PERSONAL_EXPENSE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-100 text-gray-500",
};

export const PERSONAL_PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  BANK_SLIP: "Boleto",
  TRANSFER: "Transferência",
  AUTO_DEBIT: "Débito Automático",
  OTHER: "Outros",
};

export const PERSONAL_RECURRENCE_LABELS: Record<string, string> = {
  NONE: "Não",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};
