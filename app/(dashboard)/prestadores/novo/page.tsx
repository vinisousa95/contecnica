"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ServiceProviderForm } from "@/components/service-providers/provider-form";

export default function NovoPrestadorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.serviceProviders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
      toast({ title: "Prestador cadastrado com sucesso", variant: "success" });
      router.push("/prestadores");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Novo Prestador"
        description="Cadastre um prestador de serviço parceiro"
        actions={
          <Button variant="outline" asChild>
            <Link href="/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />
      <ServiceProviderForm
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
      />
    </div>
  );
}
