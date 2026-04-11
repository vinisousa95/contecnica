"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseInput } from "@/lib/validations";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseInput>;
  defaultProjectId?: string;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
  { value: "OVERDUE", label: "Vencido" },
];

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Cartão", label: "Cartão" },
  { value: "Transferência", label: "Transferência" },
  { value: "Boleto", label: "Boleto" },
  { value: "Débito automático", label: "Débito automático" },
  { value: "Cheque", label: "Cheque" },
];

export function ExpenseForm({
  defaultValues,
  defaultProjectId,
  onSubmit,
  isLoading,
  submitLabel = "Salvar",
}: ExpenseFormProps) {
  const { data: projectsData } = useQuery({
    queryKey: ["projects", "", ""],
    queryFn: () => api.projects.list({ limit: "100" }) as Promise<any>,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => api.categories.list({ type: "EXPENSE" }) as Promise<any>,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      status: "PENDING",
      projectId: defaultProjectId ?? "",
      ...defaultValues,
    },
  });

  const projectOptions = [
    { value: "", label: "Despesa geral (sem obra)" },
    ...projects.map((p: any) => ({ value: p.id, label: p.name })),
  ];

  const categoryOptions = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c: any) => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Descrição"
              required
              placeholder="Ex: Compra de cimento"
              error={errors.description?.message}
              {...register("description")}
            />
          </div>

          <Select
            label="Obra vinculada"
            options={projectOptions}
            error={errors.projectId?.message}
            {...register("projectId")}
          />
          <Select
            label="Categoria"
            options={categoryOptions}
            error={errors.categoryId?.message}
            {...register("categoryId")}
          />

          <Input
            label="Fornecedor / Credor"
            placeholder="Nome do fornecedor"
            error={errors.supplier?.message}
            {...register("supplier")}
          />

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0,00"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <Input
            label="Data de Vencimento"
            type="date"
            required
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />

          <Input
            label="Data de Pagamento"
            type="date"
            error={errors.paymentDate?.message}
            {...register("paymentDate")}
          />

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />

          <Select
            label="Forma de Pagamento"
            placeholder="Selecione..."
            options={PAYMENT_METHODS}
            error={errors.paymentMethod?.message}
            {...register("paymentMethod")}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Observações"
              placeholder="Informações adicionais..."
              rows={2}
              error={errors.notes?.message}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
