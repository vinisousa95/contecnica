"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PersonalExpenseInput } from "@/lib/validations";
import { PersonalExpenseForm } from "@/components/personal-expenses/personal-expense-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NovoGastoPessoalPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: PersonalExpenseInput) => api.personalExpenses.create(data),
    onSuccess: () => {
      toast({ title: "Gasto pessoal criado com sucesso", variant: "success" });
      router.push("/gastos-pessoais");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar gasto", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Novo Gasto Pessoal"
        description="Registre um novo gasto pessoal"
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
            onSubmit={(data) => mutation.mutateAsync(data).then(() => {}).catch(() => {})}
            isLoading={mutation.isPending}
            submitLabel="Criar Gasto"
          />
        </CardContent>
      </Card>
    </div>
  );
}
