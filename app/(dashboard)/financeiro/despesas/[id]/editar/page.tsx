"use client";;
import { use } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ExpenseInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/financial/expense-form";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditarDespesaPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const obraId = searchParams.get("obraId");
  const backUrl = obraId ? `/obras/${obraId}` : "/financeiro/despesas";
  const queryClient = useQueryClient();

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", params.id],
    queryFn: () => api.expenses.get(params.id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: ExpenseInput) => api.expenses.update(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Despesa atualizada!", variant: "success" });
      router.push(backUrl);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!expense) return null;

  const defaultValues: Partial<ExpenseInput> = {
    ...expense,
    projectId: expense.project?.id ?? "",
    categoryId: expense.category?.id ?? "",
    amount: expense.amount != null ? Number(expense.amount).toFixed(2) : "",
    dueDate: expense.dueDate ? String(expense.dueDate).slice(0, 10) : "",
    paymentDate: expense.paymentDate ? String(expense.paymentDate).slice(0, 10) : "",
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Editar Despesa"
        description={expense.description}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ExpenseForm
        defaultValues={defaultValues}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
