"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

const SESSION_KEY = "finance_access_verified";

export function FinancePinGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "unlocked" | "locked">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setStatus("unlocked");
      return;
    }
    fetch("/api/v1/verify-finance-pin")
      .then((r) => r.json())
      .then((d) => setStatus(d.required ? "locked" : "unlocked"))
      .catch(() => setStatus("unlocked"));
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
        sessionStorage.setItem(SESSION_KEY, "true");
        setStatus("unlocked");
      } else {
        setError("PIN incorreto. Tente novamente.");
        setPin("");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (status === "checking") return null;
  if (status === "unlocked") return <>{children}</>;

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
