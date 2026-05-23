"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NovoCompradorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "", cpfCnpj: "", phone: "", email: "",
    address: "", city: "", state: "", notes: "", status: "ACTIVE",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.partnershipBuyers.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership-buyers"] });
      toast({ title: "Comprador criado com sucesso!", variant: "success" });
      router.push("/obras-parcerias/compradores");
    },
    onError: (e: Error) => toast({ title: "Erro ao criar", description: e.message, variant: "error" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    mutation.mutate({
      ...form,
      cpfCnpj: form.cpfCnpj || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
    });
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Novo Comprador / Parceiro"
        description="Cadastre um comprador ou parceiro"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/obras-parcerias/compradores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Nome" required placeholder="Nome completo ou razão social" value={form.name} onChange={f("name")} />
              </div>

              <Input label="CPF / CNPJ" placeholder="000.000.000-00" value={form.cpfCnpj} onChange={f("cpfCnpj")} />
              <Input label="Telefone" placeholder="(00) 00000-0000" value={form.phone} onChange={f("phone")} />

              <div className="sm:col-span-2">
                <Input label="E-mail" type="email" placeholder="email@exemplo.com" value={form.email} onChange={f("email")} />
              </div>

              <div className="sm:col-span-2">
                <Input label="Endereço" placeholder="Rua, número, bairro..." value={form.address} onChange={f("address")} />
              </div>

              <Input label="Cidade" placeholder="Cidade" value={form.city} onChange={f("city")} />

              <Select
                label="Estado"
                value={form.state}
                onChange={f("state")}
                options={[
                  { value: "", label: "Selecionar estado..." },
                  ...["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s => ({ value: s, label: s }))
                ]}
              />

              <Select
                label="Status"
                value={form.status}
                onChange={f("status")}
                options={[
                  { value: "ACTIVE", label: "Ativo" },
                  { value: "INACTIVE", label: "Inativo" },
                ]}
              />
            </div>

            <Textarea label="Observações" placeholder="Informações adicionais..." value={form.notes} onChange={f("notes") as any} rows={3} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/obras-parcerias/compradores">Cancelar</Link>
          </Button>
          <Button type="submit" loading={mutation.isPending}>Criar Comprador</Button>
        </div>
      </form>
    </div>
  );
}
