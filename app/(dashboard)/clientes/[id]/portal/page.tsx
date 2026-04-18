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
import { useState } from "react";

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

type CreateForm = z.infer<typeof createSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ClientPortalPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const { data: portalUser, isLoading } = useQuery({
    queryKey: ["client-portal", params.id],
    queryFn: () => apiFetch(`/api/v1/clients/${params.id}/portal`),
  });

  const { data: client } = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => apiFetch(`/api/v1/clients/${params.id}`),
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    formState: { errors: createErrors, isSubmitting: creatingAccess },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: client?.name ?? "", email: client?.email ?? "" },
  });

  const {
    register: registerReset,
    handleSubmit: handleReset,
    reset: resetForm,
    formState: { errors: resetErrors, isSubmitting: resettingPwd },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onCreate = async (data: CreateForm) => {
    try {
      await apiFetch(`/api/v1/clients/${params.id}/portal`, { method: "POST", body: JSON.stringify(data) });
      toast({ title: "Acesso criado com sucesso" });
      qc.invalidateQueries({ queryKey: ["client-portal", params.id] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

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

      {/* No portal user — create form */}
      {!portalUser && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Criar Acesso ao Portal</h3>
          <form onSubmit={handleCreate(onCreate)} className="space-y-4">
            <Input label="Nome do usuário *" placeholder="Nome completo" error={createErrors.name?.message} {...registerCreate("name")} />
            <Input label="E-mail *" type="email" placeholder="cliente@email.com" error={createErrors.email?.message} {...registerCreate("email")} />
            <div className="relative">
              <Input
                label="Senha *"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                error={createErrors.password?.message}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...registerCreate("password")}
              />
            </div>
            <Button type="submit" loading={creatingAccess} className="w-full">
              <Shield className="h-4 w-4 mr-1" /> Criar acesso
            </Button>
          </form>
        </div>
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
