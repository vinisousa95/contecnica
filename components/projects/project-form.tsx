"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, type ProjectInput } from "@/lib/validations";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, MapPin, DollarSign, User } from "lucide-react";

interface ProjectFormProps {
  defaultValues?: Partial<ProjectInput>;
  defaultClientId?: string;
  onSubmit: (data: ProjectInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planejamento" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "PAUSED", label: "Pausada" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "CANCELLED", label: "Cancelada" },
];

export function ProjectForm({
  defaultValues,
  defaultClientId,
  onSubmit,
  isLoading,
  submitLabel = "Salvar",
}: ProjectFormProps) {
  const { data: clientsData } = useQuery({
    queryKey: ["clients", "", "ACTIVE"],
    queryFn: () => api.clients.list({ status: "ACTIVE", limit: "100" }) as Promise<any>,
  });

  const clients = Array.isArray(clientsData) ? clientsData : [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "PLANNING",
      clientId: defaultClientId ?? "",
      ...defaultValues,
    },
  });

  const clientOptions = clients.map((c: any) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HardHat className="h-4 w-4 text-gray-500" />
            Informações da Obra
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome da Obra"
              required
              placeholder="Ex: Reforma Apartamento Centro"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <Select
            label="Cliente"
            required
            placeholder="Selecione o cliente"
            options={clientOptions}
            error={errors.clientId?.message}
            {...register("clientId")}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />
          <Input
            label="Data de Início"
            type="date"
            error={errors.startDate?.message}
            {...register("startDate")}
          />
          <Input
            label="Previsão de Término"
            type="date"
            error={errors.expectedEndDate?.message}
            {...register("expectedEndDate")}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Descrição"
              placeholder="Descreva o escopo da obra..."
              rows={3}
              error={errors.description?.message}
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Orçamento Previsto (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            error={errors.budget?.message}
            {...register("budget")}
          />
          <p className="text-xs text-gray-400 mt-2">
            O progresso da obra é calculado automaticamente com base na conclusão dos itens de execução.
          </p>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            Endereço da Obra
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="CEP"
            placeholder="00000-000"
            {...register("zipCode")}
          />
          <div className="md:col-span-2">
            <Input
              label="Logradouro"
              placeholder="Rua, Avenida, etc."
              {...register("street")}
            />
          </div>
          <Input label="Número" placeholder="000" {...register("number")} />
          <Input label="Complemento" placeholder="Apto, casa..." {...register("complement")} />
          <Input label="Bairro" placeholder="Bairro" {...register("neighborhood")} />
          <Input label="Cidade" placeholder="Cidade" {...register("city")} />
          <Input
            label="Estado (UF)"
            placeholder="SP"
            maxLength={2}
            className="uppercase"
            {...register("state")}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-5">
          <Textarea
            label="Observações"
            placeholder="Informações adicionais sobre a obra..."
            rows={3}
            {...register("notes")}
          />
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
