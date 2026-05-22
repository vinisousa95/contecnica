"use client";

import { useRef, useState } from "react";
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
import { Upload, FileText, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrencyInput } from "@/lib/masks";

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
  const { data: employeesData } = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => api.employees.list({ limit: "200", status: "ACTIVE" }) as Promise<any>,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const employeesList: any[] = Array.isArray(employeesData)
    ? employeesData
    : Array.isArray(employeesData?.data)
    ? employeesData.data
    : [];

  const [attachmentUrl, setAttachmentUrl] = useState<string>(defaultValues?.attachmentUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "document");
      const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
      const text = await res.text();
      const json = JSON.parse(text);
      if (!res.ok) throw new Error(json.error ?? "Erro no upload");
      setAttachmentUrl(json.data.url);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const handleSubmitWithAttachment = async (data: ExpenseInput) => {
    await onSubmit({ ...data, attachmentUrl: attachmentUrl || null });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitWithAttachment)} className="space-y-5">
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

          {employeesList.length > 0 && (
            <Select
              label="Funcionário (preenche valor da diária)"
              options={[
                { value: "", label: "Selecione um funcionário..." },
                ...employeesList.map((e: any) => ({
                  value: e.id,
                  label: e.name + (e.dailyRate ? ` — R$ ${formatCurrencyInput(String(Number(e.dailyRate)))}` : ""),
                })),
              ]}
              value=""
              onChange={(ev) => {
                const emp = employeesList.find((e: any) => e.id === ev.target.value);
                if (!emp) return;
                if (emp.dailyRate) {
                  setValue("amount", formatCurrencyInput(String(Number(emp.dailyRate))), { shouldValidate: true });
                }
                if (!watch("description")) {
                  setValue("description", `Diária — ${emp.name}`);
                }
              }}
            />
          )}

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

          {/* Nota Fiscal upload */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nota Fiscal / Comprovante</label>
            {attachmentUrl ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-green-700 font-medium truncate">Arquivo anexado</span>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-900"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setAttachmentUrl("")}
                  className="text-green-600 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg hover:border-[#EA580C] hover:bg-orange-50 transition-colors text-sm text-gray-500 hover:text-gray-700"
              >
                {uploading
                  ? <Loader2 className="h-4 w-4 animate-spin text-[#EA580C]" />
                  : <Upload className="h-4 w-4 text-gray-400" />}
                {uploading ? "Enviando..." : "Clique para anexar PDF ou imagem da nota fiscal"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
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
