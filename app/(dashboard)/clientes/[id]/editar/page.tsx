"use client";;
import { use } from "react";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ClientInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditarClientePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => api.clients.get(params.id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: ClientInput) => api.clients.update(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", params.id] });
      toast({ title: "Cliente atualizado com sucesso!", variant: "success" });
      router.push(`/clientes/${params.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!client) return null;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Editar Cliente"
        description={client.name}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clientes/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ClientForm
        defaultValues={client}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
