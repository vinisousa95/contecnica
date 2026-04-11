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
      <div className="flex items-center justify-center px-4 py-5 border-b border-sidebar-border">
        <img
          src="/logo.png"
          alt="Contécnica"
          className="w-full max-w-[180px] h-auto object-contain"
          onError={(e) => {
            const t = e.currentTarget;
            t.style.display = "none";
            const fallback = t.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden items-center gap-2">
          <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Contécnica</p>
            <p className="text-sidebar-foreground text-xs">Gestão de Reformas</p>
          </div>
        </div>
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
