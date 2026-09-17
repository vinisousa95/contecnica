"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";

// A liberação vale por pouco tempo e some ao sair. O objetivo é: se a tela ficar
// aberta e parada, ou se você trocar de aba/sair da área, o financeiro tranca de
// novo e pede o PIN. Guardamos só um horário de expiração (não o PIN).
const SESSION_KEY = "finance_access_until";
// Tempo de inatividade até trancar sozinho.
const IDLE_MS = 10 * 60 * 1000;

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
  const [mounted, setMounted] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const lock = useCallback(() => {
    writeUnlockedUntil(0);
    setStatus("locked");
    setPin("");
  }, []);

  // Enquanto destravado: renova a expiração a cada interação e tranca sozinho
  // depois de IDLE_MS sem uso. Sem travar em troca de aba/perda de foco — isso
  // disparava à toa e trancava rápido demais. Para travar na hora, use o botão.
  useEffect(() => {
    if (status !== "unlocked" || !required) return;

    const bump = () => {
      writeUnlockedUntil(Date.now() + IDLE_MS);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, IDLE_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [status, required, lock]);

  useEffect(() => {
    let active = true;
    // Falha FECHADO: só libera sem PIN quando a resposta é OK e diz claramente
    // que não há PIN cadastrado. Erro, 401, 429 ou resposta estranha → exige o
    // PIN. Antes qualquer falha (ex.: 429 por excesso de chamadas) era lida como
    // "sem PIN" e abria o financeiro sozinho — some o botão e não pedia mais PIN.
    const decideRequired = () => {
      setRequired(true);
      setStatus(readUnlockedUntil() > Date.now() ? "unlocked" : "locked");
    };
    fetch("/api/v1/verify-finance-pin")
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data && data.required === false) {
          setRequired(false);
          setStatus("unlocked");
          return;
        }
        decideRequired();
      })
      .catch(() => {
        if (active) decideRequired();
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        writeUnlockedUntil(Date.now() + IDLE_MS);
        setStatus("unlocked");
      } else if (res.status === 429 || data?.locked) {
        const min = data?.retryAfterMinutes;
        setError(
          `Muitas tentativas erradas. Tente de novo em ${min ? `${min} min` : "alguns minutos"}.`
        );
        setPin("");
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
    // O botão vai por portal no body: assim não fica preso por transform/overflow
    // de nenhuma página (o dashboard, com os gráficos, prendia a posição fixa).
    const lockButton =
      required && mounted
        ? createPortal(
            <button
              onClick={lock}
              title="Bloquear o financeiro agora (pedirá o PIN de novo)"
              className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-full bg-[#1F2937] text-white text-sm font-medium px-4 py-2.5 shadow-lg hover:bg-gray-800 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Bloquear
            </button>,
            document.body
          )
        : null;
    return (
      <>
        {children}
        {lockButton}
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
