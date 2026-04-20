"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { type EmployeeInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { maskPhone } from "@/lib/masks";

export default function EditarFuncionarioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EmployeeInput>({
    name: "",
    rg: "",
    phone: "",
    role: "",
    status: "ACTIVE",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeInput, string>>>({});
  const [initialized, setInitialized] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", params.id],
    queryFn: () => api.employees.get(params.id) as Promise<any>,
  });

  useEffect(() => {
    if (employee && !initialized) {
      setForm({
        name: employee.name,
        rg: employee.rg ?? "",
        phone: employee.phone ?? "",
        role: employee.role ?? "",
        status: employee.status,
        notes: employee.notes ?? "",
      });
      setInitialized(true);
    }
  }, [employee, initialized]);

  const mutation = useMutation({
    mutationFn: (data: EmployeeInput) => api.employees.update(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", params.id] });
      toast({ title: "Funcionário atualizado com sucesso!", variant: "success" });
      router.push(`/operacional/funcionarios/${params.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar funcionário", description: err.message, variant: "error" });
    },
  });

  function validate(): boolean {
    const newErrors: Partial<Record<keyof EmployeeInput, string>> = {};
    if (!form.name || form.name.length < 2) newErrors.name = "Nome é obrigatório (mínimo 2 caracteres)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      ...form,
      phone: form.phone || null,
      role: form.role || null,
      notes: form.notes || null,
    });
  }

  function handleChange(field: keyof EmployeeInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  if (isLoading) return <LoadingPage />;
  if (!employee) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Editar Funcionário"
        description={`Atualize os dados de ${employee.name}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/operacional/funcionarios/${params.id}`}>
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
                label="Nome"
                required
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={errors.name}
              />
              <Input
                label="Cargo / Função"
                placeholder="Ex: Pedreiro, Eletricista..."
                value={form.role ?? ""}
                onChange={(e) => handleChange("role", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="RG"
                placeholder="00.000.000-0"
                value={form.rg ?? ""}
                onChange={(e) => handleChange("rg", e.target.value)}
              />
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                maxLength={15}
                value={form.phone ?? ""}
                onChange={(e) => handleChange("phone", maskPhone(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                options={[
                  { value: "ACTIVE", label: "Ativo" },
                  { value: "INACTIVE", label: "Inativo" },
                ]}
              />
            </div>

            <Textarea
              label="Observações"
              placeholder="Informações adicionais sobre o funcionário..."
              value={form.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" asChild>
                <Link href={`/operacional/funcionarios/${params.id}`}>Cancelar</Link>
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
