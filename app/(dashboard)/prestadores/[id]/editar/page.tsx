"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ServiceProviderForm } from "@/components/service-providers/provider-form";

export default function EditarPrestadorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["service-provider", id],
    queryFn: () => api.serviceProviders.get(id),
  });

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.serviceProviders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
      queryClient.invalidateQueries({ queryKey: ["service-provider", id] });
      toast({ title: "Prestador atualizado", variant: "success" });
      router.push(`/prestadores/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Editar Prestador"
        description={(provider as any)?.name}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/prestadores/${id}`}><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />
      <ServiceProviderForm
        defaultValues={provider as any}
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
      />
    </div>
  );
}
