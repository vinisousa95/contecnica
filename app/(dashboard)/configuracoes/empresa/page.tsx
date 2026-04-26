"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

export default function EmpresaPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.companySettings.get() as Promise<any>,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: "", cnpj: "", email: "", phone: "", website: "",
      street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "",
    },
  });

  useEffect(() => {
    if (settings) reset(settings);
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

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dados da Empresa"
        description="Informações da empresa exibidas no sistema"
      />

      <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d).catch(() => {}))} className="space-y-5">
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

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar Dados"}
          </Button>
        </div>
      </form>
    </div>
  );
}
