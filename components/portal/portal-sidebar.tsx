"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  DollarSign,
  Image,
  FileText,
  HardHat,
  LogOut,
  Building2,
} from "lucide-react";

const navigation = [
  { label: "Resumo", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Andamento", href: "/portal/andamento", icon: Clock },
  { label: "Financeiro", href: "/portal/financeiro", icon: DollarSign },
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
      <div className="flex items-center justify-center px-4 py-4 border-b border-[#374151]">
        <div className="bg-white rounded-xl px-4 py-2.5 w-full flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Contécnica"
          className="w-full max-w-[150px] h-auto object-contain"
          onError={(e) => {
            const t = e.currentTarget;
            t.style.display = "none";
            const fb = t.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        <div className="hidden items-center gap-2">
          <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <p className="text-gray-900 font-bold text-sm">Contécnica</p>
        </div>
        </div>
      </div>

      {/* Portal label */}
      <div className="px-4 py-3 border-b border-[#374151]">
        <p className="text-[#EA580C] text-xs font-semibold uppercase tracking-widest">Portal do Cliente</p>
        <p className="text-white text-sm font-medium mt-0.5 truncate">{user.clientName}</p>
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
