"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalExpenseSchema, PersonalExpenseInput } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PERSONAL_EXPENSE_CATEGORY_LABELS, PERSONAL_PAYMENT_METHOD_LABELS, PERSONAL_RECURRENCE_LABELS } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";

interface PersonalExpenseFormProps {
  defaultValues?: Partial<PersonalExpenseInput>;
  onSubmit: (data: PersonalExpenseInput) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const CATEGORY_OPTIONS = Object.entries(PERSONAL_EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const PAYMENT_METHOD_OPTIONS = Object.entries(PERSONAL_PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));
const RECURRENCE_OPTIONS = Object.entries(PERSONAL_RECURRENCE_LABELS).map(([value, label]) => ({ value, label }));

export function PersonalExpenseForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Salvar",
}: PersonalExpenseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PersonalExpenseInput>({
    resolver: zodResolver(personalExpenseSchema),
    defaultValues: {
      status: "PENDING",
      isRecurring: false,
      recurrenceType: "NONE",
      ...defaultValues,
    },
  });

  const isRecurring = watch("isRecurring");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Descrição *"
            placeholder="Ex: Conta de luz, Supermercado..."
            error={errors.description?.message}
            {...register("description")}
          />
        </div>

        <Select
          label="Categoria *"
          error={errors.category?.message}
          options={[{ value: "", label: "Selecione a categoria" }, ...CATEGORY_OPTIONS]}
          {...register("category")}
        />

        <CurrencyInput
          label="Valor *"
          placeholder="0,00"
          value={watch("amount") ?? ""}
          onChange={(v) => setValue("amount", v, { shouldValidate: true })}
          error={errors.amount?.message}
        />

        <Input
          label="Data do Gasto *"
          type="date"
          error={errors.expenseDate?.message}
          {...register("expenseDate")}
        />

        <Input
          label="Data de Vencimento"
          type="date"
          error={errors.dueDate?.message}
          {...register("dueDate")}
        />

        <Select
          label="Forma de Pagamento *"
          error={errors.paymentMethod?.message}
          options={[{ value: "", label: "Selecione a forma" }, ...PAYMENT_METHOD_OPTIONS]}
          {...register("paymentMethod")}
        />

        <Select
          label="Status"
          error={errors.status?.message}
          options={[
            { value: "PENDING", label: "Pendente" },
            { value: "PAID", label: "Pago" },
            { value: "OVERDUE", label: "Vencido" },
            { value: "CANCELED", label: "Cancelado" },
          ]}
          {...register("status")}
        />

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="isRecurring"
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            {...register("isRecurring")}
          />
          <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
            Gasto recorrente
          </label>
        </div>

        {isRecurring && (
          <Select
            label="Periodicidade"
            error={errors.recurrenceType?.message}
            options={RECURRENCE_OPTIONS}
            {...register("recurrenceType")}
          />
        )}

        <div className="md:col-span-2">
          <Input
            label="Observações"
            placeholder="Notas adicionais..."
            error={errors.notes?.message}
            {...register("notes")}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
