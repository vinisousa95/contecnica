"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RevenueInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { RevenueForm } from "@/components/financial/revenue-form";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function EditarReceitaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: revenue, isLoading } = useQuery({
    queryKey: ["revenue", params.id],
    queryFn: () => api.revenues.get(params.id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: RevenueInput) => api.revenues.update(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Receita atualizada!", variant: "success" });
      router.push("/financeiro/receitas");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!revenue) return null;

  const defaultValues: Partial<RevenueInput> = {
    ...revenue,
    projectId: revenue.project?.id ?? "",
    clientId: revenue.client?.id ?? "",
    categoryId: revenue.category?.id ?? "",
    amount: String(revenue.amount),
    dueDate: revenue.dueDate ? format(new Date(revenue.dueDate), "yyyy-MM-dd") : "",
    receivedDate: revenue.receivedDate ? format(new Date(revenue.receivedDate), "yyyy-MM-dd") : "",
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Editar Receita"
        description={revenue.description}
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
        defaultValues={defaultValues}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
