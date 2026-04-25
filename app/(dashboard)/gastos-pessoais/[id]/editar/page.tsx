"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PersonalExpenseInput } from "@/lib/validations";
import { PersonalExpenseForm } from "@/components/personal-expenses/personal-expense-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditarGastoPessoalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: item, isLoading } = useQuery({
    queryKey: ["personal-expense", id],
    queryFn: () => api.personalExpenses.get(id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: PersonalExpenseInput) => api.personalExpenses.update(id, data),
    onSuccess: () => {
      toast({ title: "Gasto atualizado com sucesso", variant: "success" });
      router.push("/gastos-pessoais");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!item) return null;

  const defaultValues: Partial<PersonalExpenseInput> = {
    description: item.description,
    category: item.category,
    amount: String(item.amount),
    expenseDate: item.expenseDate ? String(item.expenseDate).slice(0, 10) : "",
    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : "",
    status: item.status,
    paymentMethod: item.paymentMethod,
    isRecurring: item.isRecurring,
    recurrenceType: item.recurrenceType,
    notes: item.notes ?? "",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Editar Gasto Pessoal"
        description={item.description}
        actions={
          <Button variant="outline" asChild>
            <Link href="/gastos-pessoais">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <PersonalExpenseForm
            defaultValues={defaultValues}
            onSubmit={(data) => mutation.mutateAsync(data).then(() => {}).catch(() => {})}
            isLoading={mutation.isPending}
            submitLabel="Salvar Alterações"
          />
        </CardContent>
      </Card>
    </div>
  );
}
