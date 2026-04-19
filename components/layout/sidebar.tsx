"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  HardHat,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Obras",
    href: "/obras",
    icon: HardHat,
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    children: [
      { label: "Contas a Pagar", href: "/financeiro/despesas", icon: ArrowDownCircle },
      { label: "Contas a Receber", href: "/financeiro/receitas", icon: ArrowUpCircle },
      { label: "Fluxo de Caixa", href: "/financeiro/fluxo", icon: TrendingUp },
    ],
  },
  {
    label: "Orçamentos",
    href: "/orcamentos",
    icon: FileText,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
  },
  {
    label: "Configurações",
    icon: Settings,
    children: [
      { label: "Usuários", href: "/configuracoes/usuarios", icon: Users },
      { label: "Categorias", href: "/configuracoes/categorias", icon: CreditCard },
      { label: "Itens de Reforma", href: "/configuracoes/itens-reforma", icon: HardHat },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((child) => child.href && pathname.startsWith(child.href));
    }
    return false;
  });

  const isActive = item.href
    ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    : false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white",
            open && "bg-sidebar-hover text-white"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
          />
        </button>
        {open && (
          <div className="ml-3 mt-0.5 pl-3 border-l border-sidebar-border space-y-0.5">
            {item.children.map((child) => (
              <NavItemComponent key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground-active font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span>{item.label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EA580C]" />}
    </Link>
  );
}

interface SidebarProps {
  user: { name: string; email: string; role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="flex flex-col w-64 bg-sidebar min-h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#EA580C]/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative flex items-center gap-3">
          {/* icon block */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] flex items-center justify-center shadow-lg shadow-[#EA580C]/25">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar shadow-sm" />
          </div>

          {/* text */}
          <div>
            <p className="text-[15px] font-extrabold tracking-tight leading-none text-white">
              Con<span className="text-[#EA580C]">técnica</span>
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] uppercase text-gray-500 mt-1">
              Sistema de Gestão
            </p>
          </div>
        </div>

        {/* bottom rule */}
        <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-[#EA580C]/30 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
          <div className="w-8 h-8 bg-[#EA580C] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-sidebar-foreground text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-hover hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
