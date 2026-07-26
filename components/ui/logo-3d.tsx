"use client";

import { Building2 } from "lucide-react";

/**
 * Logo das telas de login, sobre uma placa clara com animação 3D.
 *
 * A placa clara não é decoração: o logo tem fundo transparente e texto preto,
 * então sobre o fundo escuro do login só o traço laranja aparecia.
 *
 * Mantém o mesmo fallback das telas originais — se /logo.png não carregar,
 * exibe o ícone + nome no lugar.
 */
export function Logo3D({ className = "" }: { className?: string }) {
  return (
    <div className={`logo-3d-stage ${className}`}>
      <div className="logo-3d-plate relative rounded-2xl bg-white px-7 py-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/25">
        <img
          src="/logo.png"
          alt="Contécnica"
          className="relative h-24 w-auto object-contain"
          onError={(e) => {
            const t = e.currentTarget;
            t.style.display = "none";
            const fallback = t.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C]">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Contécnica</span>
        </div>
      </div>
    </div>
  );
}
