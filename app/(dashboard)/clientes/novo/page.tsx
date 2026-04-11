"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ClientInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NovoClientePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ClientInput) => api.clients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente cadastrado com sucesso!", variant: "success" });
      router.push("/clientes");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Novo Cliente"
        description="Preencha os dados para cadastrar um novo cliente"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ClientForm
        onSubmit={mutation.mutateAsync}
        isLoading={mutation.isPending}
        submitLabel="Cadastrar Cliente"
      />
    </div>
  );
}
