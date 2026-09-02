"use client";

import { Eye, X } from "lucide-react";
import { useState } from "react";

/**
 * Faixa fixa no topo do portal avisando que é uma sessão de "Ver como cliente"
 * (admin). Deixa impossível confundir com o portal real do cliente, e o botão
 * "Sair da visualização" limpa a sessão de impersonação.
 */
export function ImpersonationBanner({ clientName }: { clientName: string }) {
  const [leaving, setLeaving] = useState(false);

  const sair = async () => {
    setLeaving(true);
    // Encerra a sessão do portal (a mesma rota de logout do cliente) e fecha a
    // aba — o admin voltou a ser só admin no navegador dele.
    await fetch("/api/portal/v1/auth/logout", { method: "POST" }).catch(() => {});
    window.close();
    // Se o navegador não deixar fechar a aba, manda para o login do portal.
    window.location.href = "/portal/login";
  };

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white">
      <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center gap-3 text-sm">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <p className="flex-1 font-medium">
          Modo visualização — você está vendo o portal como{" "}
          <span className="font-bold">{clientName}</span>. Só para conferir; ações de pagamento e
          aprovação ficam desabilitadas.
        </p>
        <button
          onClick={sair}
          disabled={leaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 transition-colors disabled:opacity-60 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
          {leaving ? "Saindo..." : "Sair da visualização"}
        </button>
      </div>
    </div>
  );
}
