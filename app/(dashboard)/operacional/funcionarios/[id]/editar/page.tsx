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
import { maskPhone, maskCpfCnpj, maskCep } from "@/lib/masks";

export default function EditarFuncionarioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EmployeeInput>({
    name: "",
    cpf: "",
    rg: "",
    phone: "",
    role: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
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
        cpf: employee.cpf ?? "",
        rg: employee.rg ?? "",
        phone: employee.phone ?? "",
        role: employee.role ?? "",
        street: employee.street ?? "",
        number: employee.number ?? "",
        complement: employee.complement ?? "",
        neighborhood: employee.neighborhood ?? "",
        city: employee.city ?? "",
        state: employee.state ?? "",
        zipCode: employee.zipCode ?? "",
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
      cpf: form.cpf || null,
      rg: form.rg || null,
      phone: form.phone || null,
      role: form.role || null,
      street: form.street || null,
      number: form.number || null,
      complement: form.complement || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      state: form.state || null,
      zipCode: form.zipCode || null,
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
                label="CPF"
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                value={form.cpf ?? ""}
                onChange={(e) => handleChange("cpf", maskCpfCnpj(e.target.value))}
              />
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

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  value={form.zipCode ?? ""}
                  onChange={(e) => handleChange("zipCode", maskCep(e.target.value))}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Rua"
                    placeholder="Nome da rua"
                    value={form.street ?? ""}
                    onChange={(e) => handleChange("street", e.target.value)}
                  />
                </div>
                <Input
                  label="Número"
                  placeholder="123"
                  value={form.number ?? ""}
                  onChange={(e) => handleChange("number", e.target.value)}
                />
                <Input
                  label="Complemento"
                  placeholder="Apto, bloco..."
                  value={form.complement ?? ""}
                  onChange={(e) => handleChange("complement", e.target.value)}
                />
                <Input
                  label="Bairro"
                  placeholder="Bairro"
                  value={form.neighborhood ?? ""}
                  onChange={(e) => handleChange("neighborhood", e.target.value)}
                />
                <Input
                  label="Cidade"
                  placeholder="Cidade"
                  value={form.city ?? ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
                <Input
                  label="Estado"
                  placeholder="SP"
                  maxLength={2}
                  value={form.state ?? ""}
                  onChange={(e) => handleChange("state", e.target.value.toUpperCase())}
                />
              </div>
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
