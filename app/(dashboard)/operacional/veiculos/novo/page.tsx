"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { type VehicleInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NovoVeiculoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<VehicleInput>({
    name: "",
    model: "",
    plate: "",
    type: "",
    color: "",
    year: undefined,
    status: "ACTIVE",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleInput, string>>>({});

  const mutation = useMutation({
    mutationFn: (data: VehicleInput) => api.vehicles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Veículo cadastrado com sucesso!", variant: "success" });
      router.push("/operacional/veiculos");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar veículo", description: err.message, variant: "error" });
    },
  });

  function validate(): boolean {
    const newErrors: Partial<Record<keyof VehicleInput, string>> = {};
    if (!form.name || form.name.length < 2) newErrors.name = "Nome é obrigatório (mínimo 2 caracteres)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      ...form,
      model: form.model || null,
      plate: form.plate || null,
      type: form.type || null,
      color: form.color || null,
      notes: form.notes || null,
    });
  }

  function handleChange(field: keyof VehicleInput, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Novo Veículo"
        description="Cadastre um novo veículo da frota operacional"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/operacional/veiculos">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome / Identificação"
                required
                placeholder="Ex: Caminhão 01, Van Branca..."
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={errors.name}
              />
              <Input
                label="Modelo"
                placeholder="Ex: Fiat Ducato, VW Delivery..."
                value={form.model ?? ""}
                onChange={(e) => handleChange("model", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Placa"
                placeholder="ABC-1234"
                value={form.plate ?? ""}
                onChange={(e) => handleChange("plate", e.target.value.toUpperCase())}
              />
              <Input
                label="Tipo"
                placeholder="Ex: Van, Caminhão, Moto..."
                value={form.type ?? ""}
                onChange={(e) => handleChange("type", e.target.value)}
              />
              <Input
                label="Cor"
                placeholder="Ex: Branco, Prata..."
                value={form.color ?? ""}
                onChange={(e) => handleChange("color", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ano"
                type="number"
                placeholder="Ex: 2020"
                min={1950}
                max={new Date().getFullYear() + 1}
                value={form.year ?? ""}
                onChange={(e) => handleChange("year", e.target.value ? parseInt(e.target.value) : null)}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                options={[
                  { value: "ACTIVE", label: "Ativo" },
                  { value: "MAINTENANCE", label: "Em Manutenção" },
                  { value: "INACTIVE", label: "Inativo" },
                ]}
              />
            </div>

            <Textarea
              label="Observações"
              placeholder="Informações adicionais sobre o veículo..."
              value={form.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" asChild>
                <Link href="/operacional/veiculos">Cancelar</Link>
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Cadastrar Veículo
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
