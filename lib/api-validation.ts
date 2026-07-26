import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Validação de entrada da API — helper central
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Aplica, de forma uniforme:
 *   1. limite de tamanho do payload (413);
 *   2. JSON malformado → erro claro (400);
 *   3. validação de tipo/formato por schema zod (400 com o campo problemático);
 *   4. rejeição de propriedades não previstas — use `.strict()` no schema.
 *
 * Para ajustar limites, altere MAX_BODY_BYTES abaixo.
 */

/** Payload máximo para JSON. Uploads binários têm o próprio limite na rota. */
export const MAX_BODY_BYTES = 512 * 1024; // 512 KB

/** Orçamentos e ambientes enviam arrays grandes de itens. */
export const MAX_BODY_BYTES_LARGE = 2 * 1024 * 1024; // 2 MB

/**
 * Teto por caminho, aplicado no middleware para TODA rota de API — inclusive as
 * que validam com `schema.safeParse` direto e não passam por `validateBody`.
 * Ordem importa: o primeiro prefixo que casar vence.
 */
const PATH_LIMITS: Array<[RegExp, number]> = [
  // multipart binário
  [/^\/api\/v1\/upload$/, 12 * 1024 * 1024],
  [/^\/api\/portal\/v1\/contracts\/[^/]+\/sign$/, 22 * 1024 * 1024],
  // imagem em base64
  [/^\/api\/v1\/scan-receipt$/, 10 * 1024 * 1024],
  // payloads com arrays grandes de itens
  [/^\/api\/v1\/(budgets|reform-packages|contracts|contract-templates)/, MAX_BODY_BYTES_LARGE],
];

/** Limite de corpo para um caminho de API. */
export function maxBodyBytesForPath(pathname: string): number {
  for (const [re, limit] of PATH_LIMITS) {
    if (re.test(pathname)) return limit;
  }
  return MAX_BODY_BYTES;
}

export type ValidationFailure = { ok: false; error: string; status: number };
export type ValidationSuccess<T> = { ok: true; data: T };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/** Mensagem legível a partir do erro do zod, apontando o campo. */
export function formatZodError(error: z.ZodError): string {
  const issue = error.errors[0];
  const path = issue.path.join(".");

  if (issue.code === "unrecognized_keys") {
    const keys = (issue as z.ZodInvalidTypeIssue & { keys?: string[] }).keys ?? [];
    const where = path ? ` em "${path}"` : "";
    return `Campo${keys.length > 1 ? "s" : ""} não permitido${keys.length > 1 ? "s" : ""}${where}: ${keys.join(", ")}`;
  }

  return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Lê e valida o corpo JSON da requisição.
 *
 * @example
 *   const parsed = await validateBody(request, schema);
 *   if (!parsed.ok) return apiError(parsed.error, parsed.status);
 *   const data = parsed.data;
 */
export async function validateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
  opts: { maxBytes?: number } = {}
): Promise<ValidationResult<z.infer<T>>> {
  const maxBytes = opts.maxBytes ?? MAX_BODY_BYTES;

  // Content-Length quando presente: barra o payload antes de ler o corpo.
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload muito grande (máx ${Math.floor(maxBytes / 1024)} KB).`,
    };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, status: 400, error: "Não foi possível ler o corpo da requisição." };
  }

  // Content-Length pode estar ausente ou mentir (chunked): confere o tamanho real.
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload muito grande (máx ${Math.floor(maxBytes / 1024)} KB).`,
    };
  }

  if (!raw.trim()) {
    return { ok: false, status: 400, error: "Corpo da requisição vazio." };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "JSON inválido." };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, status: 400, error: formatZodError(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

// ── Blocos reutilizáveis ─────────────────────────────────────────────────────

/** Texto curto obrigatório, com trim e limite de tamanho. */
export const requiredText = (label: string, max = 200) =>
  z.string({ required_error: `${label} é obrigatório` }).trim().min(1, `${label} é obrigatório`).max(max, `${label} excede ${max} caracteres`);

/** Texto opcional que aceita "" e null, normalizando para null. */
export const optionalText = (max = 500) =>
  z.string().max(max, `Texto excede ${max} caracteres`).optional().nullable().transform((v) => (v === "" ? null : v ?? null));

/** Valor monetário aceito como string ou número, convertido para número. */
export const money = (label = "Valor") =>
  z.union([z.string(), z.number()]).optional().nullable().transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} inválido` });
      return z.NEVER;
    }
    return n;
  });

/** Data ISO (YYYY-MM-DD) ou datetime; vazio vira null. */
export const dateString = () =>
  z.string().optional().nullable().transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v.length === 10 ? `${v}T12:00:00.000Z` : v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida" });
      return z.NEVER;
    }
    return d;
  });
