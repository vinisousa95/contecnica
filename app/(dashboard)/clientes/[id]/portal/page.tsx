"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Shield, ShieldOff, Eye, EyeOff, Trash2, UserCheck, UserX, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useState, use } from "react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

const createSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const resetSchema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const emailSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type CreateForm = z.infer<typeof createSchema>;
type ResetForm = z.infer<typeof resetSchema>;
type EmailForm = z.infer<typeof emailSchema>;

export default function ClientPortalPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);

  const { data: portalUser, isLoading } = useQuery({
    queryKey: ["client-portal", params.id],
    queryFn: () => apiFetch(`/api/v1/clients/${params.id}/portal`),
  });

  const { data: client } = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => apiFetch(`/api/v1/clients/${params.id}`),
  });

  const {
    register: registerReset,
    handleSubmit: handleReset,
    reset: resetForm,
    formState: { errors: resetErrors, isSubmitting: resettingPwd },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const {
    register: registerEmail,
    handleSubmit: handleEmail,
    setValue: setEmailValue,
    formState: { errors: emailErrors, isSubmitting: savingEmail },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const onToggleActive = async () => {
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !portalUser.isActive }),
      });
      toast({ title: portalUser.isActive ? "Acesso desativado" : "Acesso ativado" });
      qc.invalidateQueries({ queryKey: ["client-portal", params.id] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const onResetPassword = async (data: ResetForm) => {
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, {
        method: "PUT",
        body: JSON.stringify({ password: data.password }),
      });
      toast({ title: "Senha alterada com sucesso" });
      resetForm();
      setShowResetPassword(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const onChangeEmail = async (data: EmailForm) => {
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, {
        method: "PUT",
        body: JSON.stringify({ email: data.email }),
      });
      toast({ title: "E-mail de acesso alterado", description: `O cliente passa a entrar com ${data.email}.` });
      qc.invalidateQueries({ queryKey: ["client-portal", params.id] });
      setShowChangeEmail(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const onSkipPasswordChange = async () => {
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, {
        method: "PUT",
        body: JSON.stringify({ mustChangePassword: false }),
      });
      toast({ title: "Troca obrigatória dispensada" });
      qc.invalidateQueries({ queryKey: ["client-portal", params.id] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const onDelete = async () => {
    if (!confirm("Remover acesso ao portal? O cliente não conseguirá mais entrar.")) return;
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, { method: "DELETE" });
      toast({ title: "Acesso removido" });
      qc.invalidateQueries({ queryKey: ["client-portal", params.id] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  if (isLoading) return <LoadingPage message="Carregando acesso do portal..." />;

  // Divergência entre a credencial de login e o e-mail do cadastro. Vale avisar:
  // é o que faz alguém alterar o cliente e achar que o portal mudou junto.
  const emailDivergente =
    !!portalUser && !!client?.email && portalUser.email.toLowerCase() !== client.email.toLowerCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/clientes/${params.id}`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        </Link>
        <PageHeader
          title="Portal do Cliente"
          description="Gerencie o acesso do cliente ao portal de acompanhamento"
        />
      </div>

      {/* Status card */}
      <div className={`rounded-xl p-5 border ${portalUser ? (portalUser.isActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200") : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${portalUser ? (portalUser.isActive ? "bg-green-100" : "bg-gray-200") : "bg-amber-100"}`}>
            {portalUser ? (portalUser.isActive ? <UserCheck className="h-5 w-5 text-green-600" /> : <UserX className="h-5 w-5 text-gray-500" />) : <Shield className="h-5 w-5 text-amber-600" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              {portalUser ? (portalUser.isActive ? "Acesso ativo" : "Acesso desativado") : "Sem acesso ao portal"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {portalUser
                ? `${portalUser.email} · Criado em ${formatDate(portalUser.createdAt)}${portalUser.lastLoginAt ? ` · Último acesso: ${formatDate(portalUser.lastLoginAt)}` : ""}`
                : "Este cliente ainda não possui login no portal."}
            </p>
          </div>
          {portalUser && (
            <a
              href="/portal/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              Abrir portal
            </a>
          )}
        </div>
      </div>

      {/* Criação do acesso. Só monta quando os dados do cliente chegaram: o
          react-hook-form aplica os defaultValues uma única vez, na montagem,
          então montar antes deixava nome e e-mail em branco para sempre. */}
      {!portalUser && client && (
        <CreateAccessForm
          clientId={params.id}
          clientName={client.name ?? ""}
          clientEmail={client.email ?? ""}
          onCreated={() => qc.invalidateQueries({ queryKey: ["client-portal", params.id] })}
        />
      )}

      {/* Has portal user — management */}
      {portalUser && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-gray-900">Gerenciar Acesso</h3>

          {/* Toggle active */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Status do acesso</p>
              <p className="text-xs text-gray-400">{portalUser.isActive ? "Cliente pode entrar no portal" : "Acesso temporariamente bloqueado"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleActive}
            >
              {portalUser.isActive ? <><UserX className="h-4 w-4 mr-1" /> Desativar</> : <><UserCheck className="h-4 w-4 mr-1" /> Ativar</>}
            </Button>
          </div>

          {/* E-mail de acesso — a credencial de login, distinta do e-mail do
              cadastro do cliente. Antes não havia como trocar por tela nenhuma. */}
          <div className="py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">E-mail de acesso</p>
                <p className="text-xs text-gray-400 truncate">
                  O cliente entra no portal com <span className="font-medium text-gray-600">{portalUser.email}</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  // Já vem preenchido com o e-mail do cadastro: é quase sempre
                  // para onde a pessoa quer mudar.
                  if (!showChangeEmail) setEmailValue("email", client?.email ?? portalUser.email);
                  setShowChangeEmail(!showChangeEmail);
                }}
              >
                {showChangeEmail ? "Cancelar" : "Alterar e-mail"}
              </Button>
            </div>

            {emailDivergente && !showChangeEmail && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                <p className="font-medium">O login do portal é diferente do e-mail do cadastro.</p>
                <p className="mt-0.5">
                  Cadastro: <span className="font-mono">{client?.email}</span> · Login:{" "}
                  <span className="font-mono">{portalUser.email}</span>
                </p>
                <p className="mt-1">
                  Alterar o e-mail do cliente não muda o login — são dados separados. Use
                  &quot;Alterar e-mail&quot; se quiser igualar.
                </p>
              </div>
            )}

            {showChangeEmail && (
              <form onSubmit={handleEmail(onChangeEmail)} className="flex gap-2 mt-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="novo@email.com"
                    error={emailErrors.email?.message}
                    {...registerEmail("email")}
                  />
                </div>
                <Button type="submit" loading={savingEmail} size="sm">Salvar</Button>
              </form>
            )}
            {showChangeEmail && (
              <p className="text-xs text-gray-400 mt-2">
                A senha não muda. Avise o cliente do novo e-mail — é com ele que ele passa a
                entrar.
              </p>
            )}
          </div>

          {/* Primeiro acesso: troca de senha obrigatória e aceite da LGPD.
              Os dois são resolvidos pelo próprio cliente ao entrar no portal —
              aqui a Contécnica só acompanha, e pode dispensar a troca se o
              cliente não conseguir concluir. */}
          <div className="py-3 border-b border-gray-100 space-y-2.5">
            <p className="text-sm font-medium text-gray-900">Primeiro acesso</p>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {portalUser.mustChangePassword
                  ? "Vai trocar a senha no próximo acesso"
                  : "Senha já definida pelo cliente"}
              </p>
              {portalUser.mustChangePassword ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex-shrink-0">
                  Troca pendente
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 flex-shrink-0">
                  Concluído
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {portalUser.privacyAcceptedAt
                  ? `Política de privacidade aceita em ${formatDate(portalUser.privacyAcceptedAt)}`
                  : "Política de privacidade ainda não aceita"}
              </p>
              {portalUser.privacyAcceptedAt ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 flex-shrink-0">
                  Aceita
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex-shrink-0">
                  Pendente
                </span>
              )}
            </div>

            {portalUser.mustChangePassword && (
              <button
                type="button"
                onClick={onSkipPasswordChange}
                className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Dispensar a troca obrigatória
              </button>
            )}
          </div>

          {/* Reset password */}
          <div className="py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Redefinir senha</p>
                <p className="text-xs text-gray-400">Defina uma nova senha para o cliente</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowResetPassword(!showResetPassword)}>
                {showResetPassword ? "Cancelar" : "Alterar senha"}
              </Button>
            </div>
            {showResetPassword && (
              <form onSubmit={handleReset(onResetPassword)} className="flex gap-2 mt-3">
                <div className="flex-1">
                  <Input
                    type="password"
                    placeholder="Nova senha (mínimo 6 caracteres)"
                    helperText="Provisória: o cliente troca no próximo acesso."
                    error={resetErrors.password?.message}
                    {...registerReset("password")}
                  />
                </div>
                <Button type="submit" loading={resettingPwd} size="sm">Salvar</Button>
              </form>
            )}
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Remover acesso</p>
              <p className="text-xs text-gray-400">O cliente não poderá mais entrar no portal</p>
            </div>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        </div>
      )}

      {/* Portal URL */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-600 mb-1">URL do Portal do Cliente</p>
        <p className="text-sm font-mono text-gray-800 select-all">
          {typeof window !== "undefined" ? window.location.origin : ""}/portal/login
        </p>
        <p className="text-xs text-gray-400 mt-1">Compartilhe este link com o cliente junto com o e-mail e senha.</p>
      </div>
    </div>
  );
}

function CreateAccessForm({
  clientId,
  clientName,
  clientEmail,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  onCreated: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: clientName, email: clientEmail },
  });

  const onSubmit = async (data: CreateForm) => {
    try {
      await apiFetch(`/api/v1/clients/${clientId}/portal`, { method: "POST", body: JSON.stringify(data) });
      toast({ title: "Acesso criado com sucesso" });
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Criar Acesso ao Portal</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome do usuário *" placeholder="Nome completo" error={errors.name?.message} {...register("name")} />
        <Input label="E-mail *" type="email" placeholder="cliente@email.com" error={errors.email?.message} {...register("email")} />
        <div className="relative">
          <Input
            label="Senha *"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            helperText="Senha provisória: o cliente é obrigado a trocá-la no primeiro acesso."
            error={errors.password?.message}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("password")}
          />
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          <Shield className="h-4 w-4 mr-1" /> Criar acesso
        </Button>
      </form>
    </div>
  );
}
