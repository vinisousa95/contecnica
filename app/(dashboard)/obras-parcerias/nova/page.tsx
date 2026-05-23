"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { maskCep } from "@/lib/masks";

function buildAddress(fields: { street: string; addressNumber: string; complement: string; neighborhood: string; city: string; addrState: string; cep: string }) {
  const parts = [
    fields.street,
    fields.addressNumber ? `nº ${fields.addressNumber}` : "",
    fields.complement,
    fields.neighborhood,
    fields.city,
    fields.addrState,
    fields.cep ? `CEP: ${fields.cep}` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

export default function NovaObraParceriaPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "", buyerId: "", description: "",
    startDate: "", expectedEndDate: "", status: "PLANNING", notes: "",
    // address fields
    cep: "", street: "", addressNumber: "", complement: "", neighborhood: "", city: "", addrState: "",
  });
  const [budgetStr, setBudgetStr] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const { data: buyersRaw } = useQuery({
    queryKey: ["partnership-buyers"],
    queryFn: () => api.partnershipBuyers.list(),
  });
  const buyers: any[] = Array.isArray(buyersRaw) ? buyersRaw : (buyersRaw as any)?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data: any) => api.partnershipProjects.create(data),
    onSuccess: (project: any) => {
      qc.invalidateQueries({ queryKey: ["partnership-projects"] });
      toast({ title: "Obra criada com sucesso!", variant: "success" });
      router.push(`/obras-parcerias/${project.id}`);
    },
    onError: (e: Error) => toast({ title: "Erro ao criar", description: e.message, variant: "error" }),
  });

  async function fetchCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: "CEP não encontrado", variant: "error" }); return; }
      setForm(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        addrState: data.uf || prev.addrState,
      }));
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "error" });
    } finally {
      setCepLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    if (!form.buyerId) return toast({ title: "Selecione um comprador/parceiro", variant: "error" });
    mutation.mutate({
      name: form.name, buyerId: form.buyerId, description: form.description,
      startDate: form.startDate || null, expectedEndDate: form.expectedEndDate || null,
      status: form.status, notes: form.notes,
      address: buildAddress(form),
      budgetedAmount: budgetStr ? Number(budgetStr) : null,
    });
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Nova Obra Parceria"
        description="Cadastre uma obra em parceria com comprador"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/obras-parcerias"><ArrowLeft className="h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Nome da Obra" required placeholder="Ex: Casa João Silva — Bloco A" value={form.name} onChange={f("name")} />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Comprador / Parceiro <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.buyerId}
                    onChange={f("buyerId")}
                    required
                    className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">Selecionar comprador...</option>
                    {buyers.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}{b.phone ? ` — ${b.phone}` : ""}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href="/obras-parcerias/compradores/novo" target="_blank">
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Endereço</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={(e) => setForm(prev => ({ ...prev, cep: maskCep(e.target.value) }))}
                    onBlur={(e) => fetchCep(e.target.value)}
                    maxLength={9}
                    rightIcon={cepLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : undefined}
                  />
                </div>
                <Input label="Logradouro (Rua / Av.)" placeholder="Rua das Flores" value={form.street} onChange={f("street")} />
                <Input label="Número" placeholder="123" value={form.addressNumber} onChange={f("addressNumber")} />
                <Input label="Complemento" placeholder="Ap 21, Bloco B..." value={form.complement} onChange={f("complement")} />
                <Input label="Bairro" placeholder="Centro" value={form.neighborhood} onChange={f("neighborhood")} />
                <Input label="Cidade" placeholder="São Paulo" value={form.city} onChange={f("city")} />
                <Select
                  label="Estado"
                  value={form.addrState}
                  onChange={f("addrState")}
                  options={[
                    { value: "", label: "Selecionar..." },
                    ...["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s => ({ value: s, label: s }))
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={form.status}
                onChange={f("status")}
                options={[
                  { value: "PLANNING", label: "Planejamento" },
                  { value: "IN_PROGRESS", label: "Em Andamento" },
                  { value: "PAUSED", label: "Pausada" },
                  { value: "COMPLETED", label: "Concluída" },
                  { value: "CANCELLED", label: "Cancelada" },
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor Previsto</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-gray-500 select-none pointer-events-none">R$</span>
                  <div className="w-full [&_input]:pl-9">
                    <CurrencyInput placeholder="0,00" value={budgetStr} onChange={setBudgetStr} />
                  </div>
                </div>
              </div>

              <Input label="Data de Início" type="date" value={form.startDate} onChange={f("startDate")} />
              <Input label="Previsão de Término" type="date" value={form.expectedEndDate} onChange={f("expectedEndDate")} />
            </div>

            <Textarea label="Descrição" placeholder="Descrição da obra..." value={form.description} onChange={f("description") as any} rows={2} />
            <Textarea label="Observações" placeholder="Observações adicionais..." value={form.notes} onChange={f("notes") as any} rows={2} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/obras-parcerias">Cancelar</Link>
          </Button>
          <Button type="submit" loading={mutation.isPending}>Criar Obra</Button>
        </div>
      </form>
    </div>
  );
}
