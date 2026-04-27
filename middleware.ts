import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { verifyPortalToken } from "@/lib/portal-auth";

const ADMIN_PUBLIC = ["/login", "/api/v1/auth/login"];
const PORTAL_PUBLIC = ["/portal/login", "/api/portal/v1/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // MANAGER: sem acesso ao dashboard, financeiro, relatórios, gastos pessoais e configurações
  if (role === "MANAGER") {
    const blocked = [
      "/dashboard", "/financeiro", "/relatorios", "/gastos-pessoais", "/configuracoes",
      "/api/v1/expenses", "/api/v1/revenues", "/api/v1/reports",
      "/api/v1/personal-expenses", "/api/v1/company-settings",
      "/api/v1/contract-templates", "/api/v1/users",
    ];
    const isBlocked = blocked.some((p) => pathname.startsWith(p));
    if (isBlocked) {
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
