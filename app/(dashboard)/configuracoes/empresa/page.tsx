"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { Building2, PenLine, Upload, X, Image as ImageIcon } from "lucide-react";

export default function EmpresaPage() {
  const queryClient = useQueryClient();
  const sigFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploading, setUploading] = useState<"" | "logo" | "signature">("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.companySettings.get() as Promise<any>,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "", cnpj: "", email: "", phone: "", website: "",
      street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "",
    },
  });

  useEffect(() => {
    if (settings) {
      reset(settings);
      setSignatureUrl(settings.signatureUrl ?? "");
      setLogoUrl(settings.logoUrl ?? "");
    }
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.companySettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Dados da empresa salvos", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "error" });
    },
  });

  const handleUpload = async (file: File, target: "logo" | "signature") => {
    setUploading(target);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "image");
      const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json?.data?.url) {
        throw new Error(json?.error ?? "Falha no upload");
      }
      if (target === "logo") setLogoUrl(json.data.url);
      else setSignatureUrl(json.data.url);
      toast({
        title: `${target === "logo" ? "Logo" : "Assinatura"} enviada — clique em Salvar Dados`,
        variant: "success",
      });
    } catch (e: any) {
      toast({ title: "Erro ao enviar imagem", description: e.message, variant: "error" });
    } finally {
      setUploading("");
      if (logoFileRef.current) logoFileRef.current.value = "";
      if (sigFileRef.current) sigFileRef.current.value = "";
    }
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dados da Empresa"
        description="Informações da empresa exibidas no sistema"
      />

      <form
        onSubmit={handleSubmit((d) => {
          // reset(settings) traz o objeto inteiro pro form (inclusive id e
          // updatedAt). A API valida com .strict() e recusa chaves extras, então
          // removo o que não faz parte do payload antes de enviar.
          const { id, updatedAt, createdAt, logoUrl: _l, signatureUrl: _s, ...rest } = d as any;
          return mutation
            .mutateAsync({ ...rest, logoUrl: logoUrl || "", signatureUrl: signatureUrl || "" })
            .catch(() => {});
        })}
        className="space-y-5"
      >
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Informações Gerais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Nome da Empresa *" placeholder="Razão social ou nome fantasia" {...register("name")} />
              </div>
              <Input label="CNPJ" placeholder="00.000.000/0000-00" {...register("cnpj")} />
              <Input label="Telefone" placeholder="(00) 00000-0000" {...register("phone")} />
              <Input label="E-mail" type="email" placeholder="contato@empresa.com" {...register("email")} />
              <Input label="Site" placeholder="https://empresa.com.br" {...register("website")} />
            </div>

            {/* Logo da empresa */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700">Logo da empresa</h4>
              </div>
              <p className="text-xs text-gray-500">
                Aparece no cabeçalho dos recibos. PNG ou JPG.
              </p>
              {logoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="border border-gray-200 rounded-lg p-3 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={uploading !== ""}>
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setLogoUrl("")}
                      disabled={uploading !== ""}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={uploading !== ""}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading === "logo" ? "Enviando…" : "Enviar logo"}
                </Button>
              )}
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f, "logo");
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="CEP" placeholder="00000-000" {...register("zipCode")} />
              <div />
              <div className="md:col-span-2">
                <Input label="Rua" placeholder="Rua, Avenida..." {...register("street")} />
              </div>
              <Input label="Número" placeholder="000" {...register("number")} />
              <Input label="Complemento" placeholder="Sala, Andar..." {...register("complement")} />
              <Input label="Bairro" placeholder="Bairro" {...register("neighborhood")} />
              <Input label="Cidade" placeholder="Cidade" {...register("city")} />
              <Input label="Estado" placeholder="SP" {...register("state")} />
            </div>
          </CardContent>
        </Card>

        {/* Assinatura para os recibos */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Assinatura para recibos</h3>
            </div>
            <p className="text-xs text-gray-500">
              Envie uma imagem da sua assinatura (PNG com fundo transparente fica melhor).
              Ela aparece automaticamente nos recibos, acima da linha de assinatura.
            </p>

            {signatureUrl ? (
              <div className="flex items-center gap-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Assinatura" className="h-16 object-contain" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => sigFileRef.current?.click()} disabled={uploading !== ""}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setSignatureUrl("")}
                    disabled={uploading !== ""}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => sigFileRef.current?.click()} disabled={uploading !== ""}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploading === "signature" ? "Enviando…" : "Enviar assinatura"}
              </Button>
            )}

            <input
              ref={sigFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, "signature");
              }}
            />
            <p className="text-xs text-gray-400">
              Lembre-se de clicar em <strong>Salvar Dados</strong> para gravar a alteração.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending || uploading !== ""}>
            {mutation.isPending ? "Salvando..." : "Salvar Dados"}
          </Button>
        </div>
      </form>
    </div>
  );
}
