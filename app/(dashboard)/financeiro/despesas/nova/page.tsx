"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ExpenseInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/financial/expense-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovaDespesaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultProjectId = searchParams.get("obraId") ?? undefined;

  const mutation = useMutation({
    mutationFn: (data: ExpenseInput) => api.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Despesa cadastrada com sucesso!", variant: "success" });
      router.push("/financeiro/despesas");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar despesa", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Nova Despesa"
        description="Registre uma nova conta a pagar"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/financeiro/despesas">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ExpenseForm
        defaultProjectId={defaultProjectId}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Cadastrar Despesa"
      />
    </div>
  );
}
