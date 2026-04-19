"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RevenueInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { RevenueForm } from "@/components/financial/revenue-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovaReceitaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultProjectId = searchParams.get("obraId") ?? undefined;

  const mutation = useMutation({
    mutationFn: (data: RevenueInput) => api.revenues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Receita cadastrada com sucesso!", variant: "success" });
      router.push("/financeiro/receitas");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar receita", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Nova Receita"
        description="Registre um novo recebimento"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/financeiro/receitas">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <RevenueForm
        defaultProjectId={defaultProjectId}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Cadastrar Receita"
      />
    </div>
  );
}
