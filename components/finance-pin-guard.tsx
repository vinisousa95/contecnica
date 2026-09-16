"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Lock } from "lucide-react";

// A liberação vale por pouco tempo e some ao sair. O objetivo é: se a tela ficar
// aberta e parada, ou se você trocar de aba/sair da área, o financeiro tranca de
// novo e pede o PIN. Guardamos só um horário de expiração (não o PIN).
const SESSION_KEY = "finance_access_until";
// Tempo de inatividade até trancar sozinho.
const IDLE_MS = 2 * 60 * 1000;

function readUnlockedUntil(): number {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}
function writeUnlockedUntil(ts: number) {
  try {
    if (ts > 0) sessionStorage.setItem(SESSION_KEY, String(ts));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* sessionStorage indisponível: cai no estado em memória */
  }
}

export function FinancePinGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "unlocked" | "locked">("checking");
  const [required, setRequired] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    writeUnlockedUntil(0);
    setStatus("locked");
    setPin("");
  }, []);

  // Enquanto destravado: renova a expiração a cada interação e tranca ao ficar
  // parado (IDLE_MS) ou ao esconder a aba/janela.
  useEffect(() => {
    if (status !== "unlocked" || !required) return;

    const bump = () => {
      writeUnlockedUntil(Date.now() + IDLE_MS);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, IDLE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lock();
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", lock);
    bump();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", lock);
    };
  }, [status, required, lock]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/verify-finance-pin")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.required) {
          setRequired(false);
          setStatus("unlocked");
          return;
        }
        setRequired(true);
        // Só continua liberado se a janela de tempo ainda estiver válida.
        setStatus(readUnlockedUntil() > Date.now() ? "unlocked" : "locked");
      })
      .catch(() => {
        if (active) setStatus("unlocked");
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/v1/verify-finance-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        writeUnlockedUntil(Date.now() + IDLE_MS);
        setStatus("unlocked");
      } else {
        setError("PIN incorreto. Tente novamente.");
        setPin("");
      }
    } catch {
      setError("Não foi possível verificar agora. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  };

  if (status === "checking") return null;
  if (status === "unlocked") {
    return (
      <>
        {children}
        {required && (
          // Trava manual: fecha o financeiro na hora, sem esperar o tempo de
          // inatividade. Fica fixo no canto para estar sempre à mão.
          <button
            onClick={lock}
            title="Bloquear o financeiro agora (pedirá o PIN de novo)"
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#1F2937] text-white text-sm font-medium px-4 py-2.5 shadow-lg hover:bg-gray-800 transition-colors"
          >
            <Lock className="h-4 w-4" />
            Bloquear
          </button>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-7 w-7 text-orange-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Acesso Restrito</h2>
        <p className="text-sm text-gray-500 mb-6">Digite o PIN para acessar esta área financeira</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            autoFocus
            maxLength={10}
            inputMode="numeric"
            className="w-full text-center text-2xl tracking-widest border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={!pin || verifying}
            className="w-full bg-[#EA580C] text-white rounded-lg py-2.5 font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {verifying ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
