"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { type BudgetInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { BudgetForm } from "@/components/budgets/budget-form";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function EditarOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: budget, isLoading } = useQuery({
    queryKey: ["budget", id],
    queryFn: () => api.budgets.get(id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: BudgetInput) => api.budgets.update(id, data) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget", id] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento atualizado!", variant: "success" });
      router.push(`/orcamentos/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!budget) return null;

  // Convert stored data back to form format
  const defaultValues: Partial<BudgetInput> = {
    clientId: budget.clientId,
    title: budget.title,
    tier: budget.tier,
    status: budget.status,
    notes: budget.notes ?? "",
    discount: Number(budget.discount ?? 0),
    validUntil: budget.validUntil
      ? new Date(budget.validUntil).toISOString().split("T")[0]
      : "",
    zipCode: budget.zipCode ?? "",
    street: budget.street ?? "",
    number: budget.number ?? "",
    complement: budget.complement ?? "",
    neighborhood: budget.neighborhood ?? "",
    city: budget.city ?? "",
    state: budget.state ?? "",
    items: (budget.items ?? []).map((i: any) => ({
      reformItemId: i.reformItemId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
    extraItems: (budget.extraItems ?? []).map((e: any) => ({
      name: e.name,
      description: e.description ?? "",
      quantity: Number(e.quantity),
      unit: e.unit,
      unitPrice: Number(e.unitPrice),
      subtotal: Number(e.subtotal),
    })),
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Editar Orçamento"
        description={`Editando: ${budget.code} — ${budget.title}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orcamentos/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <BudgetForm
        defaultValues={defaultValues}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {}).catch(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
