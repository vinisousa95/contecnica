import { NextRequest, NextResponse } from "next/server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate limiting — configuração centralizada
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Aplicado de forma central em `middleware.ts`, que intercepta TODAS as
 * requisições de API. Para ajustar limites, altere apenas RATE_LIMIT_CONFIG
 * abaixo — nenhuma rota precisa ser modificada.
 *
 * Implementação: janela fixa em memória. Adequado para deploy de processo único
 * (PM2 em modo fork, como está em produção). Se algum dia o app for escalado
 * para múltiplas instâncias, troque `store` por um armazenamento compartilhado
 * (Redis) mantendo a mesma interface.
 */

export interface RateLimitRule {
  /** Identificador do "balde" — requisições da mesma regra dividem a cota. */
  name: string;
  /** Máximo de requisições permitidas dentro da janela. */
  limit: number;
  /** Duração da janela em milissegundos. */
  windowMs: number;
}

const MINUTE = 60 * 1000;

export const RATE_LIMIT_CONFIG: Record<string, RateLimitRule> = {
  /**
   * Endpoints que verificam credenciais (login, signup, reset de senha).
   * Limite rígido contra força bruta: 5 tentativas por IP a cada 15 minutos.
   */
  auth: { name: "auth", limit: 5, windowMs: 15 * MINUTE },

  /** Escritas em geral (POST/PUT/PATCH/DELETE). */
  mutation: { name: "mutation", limit: 100, windowMs: MINUTE },

  /**
   * Endpoints que chamam APIs pagas de terceiros (leitura de nota fiscal por IA).
   * Limite baixo porque cada chamada gasta dinheiro na nossa conta — sem isso,
   * uma conta comprometida poderia gerar custo ilimitado.
   */
  ai: { name: "ai", limit: 20, windowMs: 10 * MINUTE },

  /**
   * Leituras (GET/HEAD). Limite generoso porque o dashboard dispara muitas
   * queries em paralelo e vários usuários podem compartilhar o mesmo IP público.
   */
  read: { name: "read", limit: 300, windowMs: MINUTE },
};

/**
 * Endpoints que validam credenciais → regra `auth`.
 * Todos compartilham o mesmo balde por IP, de propósito: impede que um atacante
 * alterne entre as telas de login (admin / obra / portal) para triplicar a cota,
 * já que todas autenticam contra a mesma base de usuários.
 */
const AUTH_PATTERNS: RegExp[] = [
  /\/auth\/login$/,
  /\/(signup|register)$/,
  /\/(forgot|reset|change|recover)-password$/,
  /\/password\/(reset|forgot|change)$/,
];

/**
 * Rotas sob /auth/ que NÃO são verificação de credencial e por isso não podem
 * cair no limite rígido: `/auth/me` é chamada a cada carregamento de página e
 * `/auth/logout` é inofensiva. Ambas usam os limites padrão.
 */
const AUTH_EXEMPT: RegExp[] = [/\/auth\/me$/, /\/auth\/logout$/];

/** Endpoints que consomem APIs pagas de terceiros → regra `ai`. */
const AI_PATTERNS: RegExp[] = [/\/scan-receipt$/];

/** Decide qual regra se aplica a uma requisição. */
export function resolveRule(pathname: string, method: string): RateLimitRule {
  const isExempt = AUTH_EXEMPT.some((re) => re.test(pathname));
  if (!isExempt && AUTH_PATTERNS.some((re) => re.test(pathname))) {
    return RATE_LIMIT_CONFIG.auth;
  }
  if (AI_PATTERNS.some((re) => re.test(pathname))) {
    return RATE_LIMIT_CONFIG.ai;
  }
  const isRead = method === "GET" || method === "HEAD";
  return isRead ? RATE_LIMIT_CONFIG.read : RATE_LIMIT_CONFIG.mutation;
}

// ── Store ────────────────────────────────────────────────────────────────────

type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

/** Teto de segurança: evita crescimento ilimitado se houver muitos IPs. */
const MAX_ENTRIES = 20_000;

/**
 * Limpeza sob demanda (sem timers, para funcionar em qualquer runtime).
 * Roda apenas quando o mapa cresce, então o custo é amortizado.
 */
function sweep(now: number) {
  // Array.from em vez de for..of direto no Map: independe do "target" do
  // TypeScript (o projeto não define um, então o default seria ES5).
  Array.from(store.entries()).forEach(([key, hit]) => {
    if (now >= hit.resetAt) store.delete(key);
  });
  // Se ainda estiver acima do teto após remover os expirados, descarta as
  // entradas mais antigas para o mapa não crescer sem limite.
  if (store.size > MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES;
    Array.from(store.keys())
      .slice(0, excess)
      .forEach((key) => store.delete(key));
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos até a janela reiniciar (para o header Retry-After). */
  retryAfter: number;
  limit: number;
  remaining: number;
}

/** Núcleo do limitador: contabiliza um acesso para `key`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (store.size > MAX_ENTRIES) sweep(now);

  const hit = store.get(key);

  if (!hit || now >= hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, limit, remaining: limit - 1 };
  }

  hit.count += 1;

  if (hit.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
      limit,
      remaining: 0,
    };
  }

  return { allowed: true, retryAfter: 0, limit, remaining: limit - hit.count };
}

/**
 * IP do cliente. O nginx em produção envia X-Forwarded-For; pegamos o primeiro
 * endereço da lista (o cliente original).
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  // req.ip existe no Next 14 e foi removido no Next 15 — acesso tolerante a versão.
  return req.headers.get("x-real-ip") ?? (req as any).ip ?? "unknown";
}

/** Mensagem de erro amigável em português. */
function buildMessage(rule: RateLimitRule, retryAfter: number): string {
  const minutes = Math.ceil(retryAfter / 60);
  const quando =
    retryAfter <= 60
      ? `${retryAfter} segundo${retryAfter === 1 ? "" : "s"}`
      : `${minutes} minuto${minutes === 1 ? "" : "s"}`;

  if (rule.name === "auth") {
    return `Muitas tentativas de login. Tente novamente em ${quando}.`;
  }
  return `Muitas requisições. Tente novamente em ${quando}.`;
}

/**
 * Aplica o limite a uma requisição de API.
 *
 * @returns uma resposta 429 quando o limite é excedido, ou `null` para deixar a
 *          requisição seguir normalmente.
 */
export function applyRateLimit(req: NextRequest, pathname: string): NextResponse | null {
  const rule = resolveRule(pathname, req.method);
  const ip = getClientIp(req);
  const result = rateLimit(`${rule.name}:${ip}`, rule.limit, rule.windowMs);

  if (result.allowed) return null;

  return NextResponse.json(
    { success: false, error: buildMessage(rule, result.retryAfter) },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
