"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  ShoppingCart,
  Image,
  FileText,
  HardHat,
  LogOut,
  Building2,
  Wrench,
  Users,
} from "lucide-react";

const navigation = [
  { label: "Resumo", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Andamento", href: "/portal/andamento", icon: Clock },
  { label: "Equipe na Obra", href: "/portal/equipe", icon: Users },
  { label: "Serviços Extras", href: "/portal/servicos-extras", icon: Wrench },
  { label: "Cobranças", href: "/portal/cobrancas", icon: ShoppingCart },
  { label: "Fotos", href: "/portal/fotos", icon: Image },
  { label: "Documentos", href: "/portal/documentos", icon: FileText },
  { label: "Informações", href: "/portal/obra", icon: HardHat },
];

interface PortalSidebarProps {
  user: { name: string; email: string; clientName: string };
}

export function PortalSidebar({ user }: PortalSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/portal/v1/auth/logout", { method: "POST" });
    window.location.href = "/portal/login";
  };

  return (
    <aside className="flex flex-col w-60 bg-[#1F2937] min-h-screen border-r border-[#374151]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-[#374151] relative overflow-hidden">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#EA580C]/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] flex items-center justify-center shadow-lg shadow-[#EA580C]/25">
              <span className="text-white font-black text-xl leading-none">C</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1F2937]" />
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight leading-none text-white">
              Con<span className="text-[#EA580C]">técnica</span>
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] uppercase text-gray-500 mt-1">
              Portal do Cliente
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-[#EA580C]/30 to-transparent" />
      </div>

      {/* Client name */}
      <div className="px-4 py-3 border-b border-[#374151]">
        <p className="text-white text-sm font-medium truncate">{user.clientName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/portal/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[#374151] text-white font-medium"
                  : "text-[#D1D5DB] hover:bg-[#374151] hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EA580C]" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-[#374151]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-[#EA580C] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-[#9CA3AF] text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#D1D5DB] hover:bg-[#374151] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
