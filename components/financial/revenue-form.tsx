"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { revenueSchema, type RevenueInput } from "@/lib/validations";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";

interface RevenueFormProps {
  defaultValues?: Partial<RevenueInput>;
  defaultProjectId?: string;
  onSubmit: (data: RevenueInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "RECEIVED", label: "Recebido" },
  { value: "OVERDUE", label: "Vencido" },
];

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Cartão", label: "Cartão" },
  { value: "Transferência", label: "Transferência" },
  { value: "Boleto", label: "Boleto" },
  { value: "Cheque", label: "Cheque" },
];

export function RevenueForm({
  defaultValues,
  defaultProjectId,
  onSubmit,
  isLoading,
  submitLabel = "Salvar",
}: RevenueFormProps) {
  const { data: projectsData } = useQuery({
    queryKey: ["projects", "", ""],
    queryFn: () => api.projects.list({ limit: "100" }) as Promise<any>,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "", "ACTIVE"],
    queryFn: () => api.clients.list({ status: "ACTIVE", limit: "100" }) as Promise<any>,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "INCOME"],
    queryFn: () => api.categories.list({ type: "INCOME" }) as Promise<any>,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const clients = Array.isArray(clientsData) ? clientsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RevenueInput>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      status: "PENDING",
      projectId: defaultProjectId ?? "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Descrição"
              required
              placeholder="Ex: Pagamento 1ª medição"
              error={errors.description?.message}
              {...register("description")}
            />
          </div>

          <Select
            label="Obra vinculada"
            options={[
              { value: "", label: "Receita geral (sem obra)" },
              ...projects.map((p: any) => ({ value: p.id, label: p.name })),
            ]}
            error={errors.projectId?.message}
            {...register("projectId")}
          />

          <Select
            label="Cliente"
            options={[
              { value: "", label: "Sem cliente" },
              ...clients.map((c: any) => ({ value: c.id, label: c.name })),
            ]}
            error={errors.clientId?.message}
            {...register("clientId")}
          />

          <Select
            label="Categoria"
            options={[
              { value: "", label: "Sem categoria" },
              ...categories.map((c: any) => ({ value: c.id, label: c.name })),
            ]}
            error={errors.categoryId?.message}
            {...register("categoryId")}
          />

          <CurrencyInput
            label="Valor (R$)"
            required
            placeholder="0,00"
            value={watch("amount") ?? ""}
            onChange={(v) => setValue("amount", v, { shouldValidate: true })}
            error={errors.amount?.message}
          />

          <Input
            label="Data de Vencimento"
            type="date"
            required
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />

          <Input
            label="Data de Recebimento"
            type="date"
            error={errors.receivedDate?.message}
            {...register("receivedDate")}
          />

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />

          <Select
            label="Forma de Recebimento"
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
