"use client";

import { Building2 } from "lucide-react";

/**
 * Logo com animação 3D, para uso DENTRO do card branco do login.
 *
 * Não desenha fundo próprio: o card branco onde ele fica já dá o contraste que o
 * logo precisa (fundo transparente com letras escuras). A animação gira apenas
 * a imagem — nada de placa girando atrás.
 */
export function Logo3D({ className = "" }: { className?: string }) {
  return (
    <div className={`logo-3d-stage flex justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Contécnica"
        className="logo-3d-mark h-20 w-auto object-contain"
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
  );
}
