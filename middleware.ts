import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { verifyPortalToken } from "@/lib/portal-auth";
import { applyRateLimit } from "@/lib/rate-limit";

const ADMIN_PUBLIC = ["/login", "/api/v1/auth/login"];
const PORTAL_PUBLIC = ["/portal/login", "/api/portal/v1/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting — todos os endpoints de API ──────────────
  // Vem antes do bypass de arquivos estáticos abaixo: caminhos como
  // /api/v1/uploads/photos/x.jpg contêm "." e escapariam da checagem.
  // Limites em lib/rate-limit.ts (RATE_LIMIT_CONFIG).
  if (pathname.startsWith("/api/")) {
    const limited = applyRateLimit(request, pathname);
    if (limited) return limited;
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Portal routes ──────────────────────────────────────────
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal/")) {
    if (PORTAL_PUBLIC.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    const token = request.cookies.get("contecnica_portal_session")?.value;
    if (!token) {
      if (pathname.startsWith("/api/portal/")) {
        return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      return NextResponse.redirect(url);
    }

    const session = await verifyPortalToken(token);
    if (!session) {
      if (pathname.startsWith("/api/portal/")) {
        return NextResponse.json({ success: false, error: "Sessão inválida ou expirada" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      const response = NextResponse.redirect(url);
      response.cookies.delete("contecnica_portal_session");
      return response;
    }

    return NextResponse.next();
  }

  // ── Admin routes ───────────────────────────────────────────
  if (ADMIN_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const bearerHeader = request.headers.get("Authorization");
  const bearerToken = bearerHeader?.startsWith("Bearer ") ? bearerHeader.slice(7) : null;
  const token = bearerToken ?? request.cookies.get("contecnica_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const session = await verifyToken(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Sessão inválida ou expirada" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    response.cookies.delete("contecnica_session");
    return response;
  }

  const role = session.role;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = role === "EMPLOYEE" ? "/tarefas" : role === "MANAGER" ? "/obras" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Role-based access control ──────────────────────────────

  // EMPLOYEE: só acessa /tarefas e APIs necessárias
  if (role === "EMPLOYEE") {
    const allowed = ["/tarefas", "/api/v1/assignments", "/api/v1/projects"];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/tarefas";
      return NextResponse.redirect(url);
    }
  }

  // MANAGER: allowlist. Antes era uma blocklist, e por isso qualquer caminho
  // não listado ficava liberado por omissão — foi assim que /api/v1/personal-*
  // e /obras-pessoais (dados financeiros pessoais do dono) ficaram acessíveis.
  // Com allowlist, rota nova nasce negada até ser liberada de propósito.
  if (role === "MANAGER") {
    const allowed = [
      // páginas
      "/obras", "/obras-parcerias", "/clientes", "/orcamentos", "/contratos",
      "/execucao-de-tarefas", "/prestadores", "/cronograma", "/funcionarios",
      "/operacional", "/tarefas",
      // APIs
      "/api/v1/auth", "/api/v1/projects", "/api/v1/clients", "/api/v1/budgets",
      "/api/v1/contracts", "/api/v1/tasks", "/api/v1/assignments",
      "/api/v1/service-providers", "/api/v1/employees", "/api/v1/vehicles",
      "/api/v1/absences", "/api/v1/reform-items", "/api/v1/reform-packages",
      "/api/v1/extra-item-templates", "/api/v1/categories", "/api/v1/suppliers",
      "/api/v1/upload", "/api/v1/uploads", "/api/v1/scan-receipt",
      "/api/v1/partnership-projects", "/api/v1/partnership-buyers",
      "/api/obra",
    ];
    if (!allowed.some((p) => pathname.startsWith(p))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/obras";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
