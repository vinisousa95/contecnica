"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type BudgetInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { BudgetForm } from "@/components/budgets/budget-form";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: BudgetInput) => api.budgets.create(data) as Promise<any>,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento criado com sucesso!", variant: "success" });
      router.push(`/orcamentos/${result?.id ?? ""}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar orçamento", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Novo Orçamento"
        description="Crie um novo orçamento de reforma"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/orcamentos">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <BudgetForm
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {}).catch(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Criar Orçamento"
      />
    </div>
  );
}
