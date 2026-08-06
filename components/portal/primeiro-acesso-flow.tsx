"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, KeyRound, Eye, EyeOff, Check, ExternalLink, Loader2 } from "lucide-react";

/**
 * Duas etapas em sequência: aceitar a política, depois trocar a senha.
 *
 * Ordem de propósito — o aceite vem primeiro porque é a condição para usar o
 * portal; trocar a senha de quem não aceitou os termos seria trabalho perdido.
 *
 * O `router.refresh()` no fim é essencial: a decisão de barrar está no layout do
 * portal, que é server component. Sem revalidar, ele continuaria mandando de
 * volta para cá com os dados antigos.
 */

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Não foi possível concluir. Tente novamente.");
  return json?.data;
}

export function PrimeiroAcessoFlow({
  name,
  email,
  needsPrivacy,
  mustChangePassword,
  privacyVersion,
}: {
  name: string;
  email: string;
  needsPrivacy: boolean;
  mustChangePassword: boolean;
  privacyVersion: string;
}) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<"privacidade" | "senha">(
    needsPrivacy ? "privacidade" : "senha"
  );
  const [marcado, setMarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [verSenha, setVerSenha] = useState(false);

  const concluir = () => {
    // Sai desta tela pelo layout do portal, que relê o banco.
    router.replace("/portal/dashboard");
    router.refresh();
  };

  const aceitar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await post("/api/portal/v1/auth/accept-privacy", { accepted: true, version: privacyVersion });
      if (mustChangePassword) {
        setEtapa("senha");
      } else {
        concluir();
      }
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (nova !== confirma) return setErro("A confirmação não bate com a nova senha.");
    if (nova.length < 8) return setErro("A nova senha precisa de ao menos 8 caracteres.");
    setEnviando(true);
    try {
      await post("/api/portal/v1/auth/change-password", {
        currentPassword: atual,
        newPassword: nova,
      });
      concluir();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const inputCls =
    "w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-transparent";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Olá, <span className="font-semibold text-gray-800">{name}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{email}</p>
        </div>

        {/* Passos */}
        {needsPrivacy && mustChangePassword && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                etapa === "privacidade" ? "bg-[#EA580C] text-white" : "bg-green-100 text-green-700"
              }`}
            >
              {etapa === "senha" && <Check className="h-3 w-3" />}
              1. Privacidade
            </span>
            <span className="h-px w-6 bg-gray-200" />
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                etapa === "senha" ? "bg-[#EA580C] text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              2. Nova senha
            </span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          {etapa === "privacidade" ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-[#EA580C]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Privacidade dos seus dados</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Antes de continuar, leia como tratamos as suas informações.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Em resumo:</p>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>Usamos os seus dados para executar e acompanhar a sua obra.</li>
                  <li>Não vendemos nem cedemos os seus dados para publicidade.</li>
                  <li>
                    Pagamentos são processados pelo Mercado Pago — dados de cartão não passam
                    pelo nosso servidor.
                  </li>
                  <li>
                    Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer
                    momento.
                  </li>
                </ul>
                <p className="text-xs text-gray-400 pt-1">
                  Este resumo não substitui o texto completo.
                </p>
              </div>

              <Link
                href="/portal/privacidade"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#EA580C] hover:underline"
              >
                Ler a Política de Privacidade completa
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={(e) => setMarcado(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <span className="text-sm text-gray-700">
                  Li e concordo com a{" "}
                  <span className="font-semibold">Política de Privacidade</span> da Contécnica e
                  com o tratamento dos meus dados conforme descrito nela.
                </span>
              </label>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {erro}
                </p>
              )}

              <button
                onClick={aceitar}
                disabled={!marcado || enviando}
                className="w-full h-11 rounded-xl bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#C2410C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {enviando ? "Registrando..." : "Aceitar e continuar"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Guardamos a data e a versão do seu aceite.
              </p>
            </div>
          ) : (
            <form onSubmit={trocarSenha} className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="h-5 w-5 text-[#EA580C]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Crie a sua senha</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    A senha que a Contécnica lhe passou serve só para este primeiro acesso.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Senha atual (a que você recebeu)
                  </label>
                  <input
                    type="password"
                    value={atual}
                    onChange={(e) => setAtual(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={verSenha ? "text" : "password"}
                      value={nova}
                      onChange={(e) => setNova(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      className={inputCls + " pr-11"}
                    />
                    <button
                      type="button"
                      onClick={() => setVerSenha(!verSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={verSenha ? "Ocultar" : "Mostrar"}
                    >
                      {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Confirme a nova senha
                  </label>
                  <input
                    type={verSenha ? "text" : "password"}
                    value={confirma}
                    onChange={(e) => setConfirma(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full h-11 rounded-xl bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#C2410C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {enviando ? "Salvando..." : "Salvar e entrar no portal"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Não consegue concluir? Fale com a Contécnica.
        </p>
      </div>
    </div>
  );
}
