"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { type AssignmentInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NovoRegistroPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AssignmentInput>({
    employeeId: "",
    vehicleId: "",
    projectId: "",
    date: "",
    departureTime: "",
    returnTime: "",
    notes: "",
    status: "SCHEDULED",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AssignmentInput, string>>>({});

  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees?limit=200");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects-select"],
    queryFn: () => api.projects.list({ limit: "100" }) as Promise<any>,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-active"],
    queryFn: async () => {
      const res = await fetch("/api/v1/vehicles?status=ACTIVE&limit=100");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AssignmentInput) => api.assignments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast({ title: "Registro criado com sucesso!", variant: "success" });
      router.push("/operacional");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar registro", description: err.message, variant: "error" });
    },
  });

  const employees = Array.isArray(employeesData) ? employeesData : [];
  const projects = Array.isArray(projectsData) ? projectsData : [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];

  function validate(): boolean {
    const newErrors: Partial<Record<keyof AssignmentInput, string>> = {};
    if (!form.employeeId) newErrors.employeeId = "Funcionário é obrigatório";
    if (!form.projectId) newErrors.projectId = "Obra é obrigatória";
    if (!form.date) newErrors.date = "Data é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      ...form,
      vehicleId: form.vehicleId || null,
      departureTime: form.departureTime || null,
      returnTime: form.returnTime || null,
      notes: form.notes || null,
    });
  }

  function handleChange(field: keyof AssignmentInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Novo Registro"
        description="Registre um novo deslocamento ou alocação de funcionário"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/operacional">
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
              <Select
                label="Funcionário"
                required
                value={form.employeeId}
                onChange={(e) => handleChange("employeeId", e.target.value)}
                error={errors.employeeId}
                options={[
                  { value: "", label: "Selecione o funcionário" },
                  ...employees.map((emp: any) => ({
                    value: emp.id,
                    label: emp.role ? `${emp.name} — ${emp.role}` : emp.name,
                  })),
                ]}
              />
              <Select
                label="Obra"
                required
                value={form.projectId}
                onChange={(e) => handleChange("projectId", e.target.value)}
                error={errors.projectId}
                options={[
                  { value: "", label: "Selecione a obra" },
                  ...projects.map((p: any) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            <Select
              label="Veículo (opcional)"
              value={form.vehicleId ?? ""}
              onChange={(e) => handleChange("vehicleId", e.target.value)}
              options={[
                { value: "", label: "Nenhum veículo" },
                ...vehicles.map((v: any) => ({
                  value: v.id,
                  label: v.plate ? `${v.name} — ${v.plate}` : v.name,
                })),
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Data"
                type="date"
                required
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                error={errors.date}
              />
              <Input
                label="Horário de Saída"
                type="time"
                value={form.departureTime ?? ""}
                onChange={(e) => handleChange("departureTime", e.target.value)}
              />
              <Input
                label="Horário de Retorno"
                type="time"
                value={form.returnTime ?? ""}
                onChange={(e) => handleChange("returnTime", e.target.value)}
              />
            </div>

            <Select
              label="Status"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              options={[
                { value: "SCHEDULED", label: "Agendado" },
                { value: "IN_PROGRESS", label: "Em Andamento" },
                { value: "COMPLETED", label: "Finalizado" },
                { value: "CANCELLED", label: "Cancelado" },
              ]}
            />

            <Textarea
              label="Observações"
              placeholder="Observações sobre este registro..."
              value={form.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" asChild>
                <Link href="/operacional">Cancelar</Link>
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Cadastrar Registro
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
