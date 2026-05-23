"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { maskCep } from "@/lib/masks";

function buildAddress(f: { street: string; addressNumber: string; complement: string; neighborhood: string; city: string; addrState: string; cep: string }) {
  return [f.street, f.addressNumber ? `nº ${f.addressNumber}` : "", f.complement, f.neighborhood, f.city, f.addrState, f.cep ? `CEP: ${f.cep}` : ""].filter(Boolean).join(", ");
}

function extractCep(address: string) {
  const match = address.match(/CEP:\s*([\d]{5}-?[\d]{3})/i);
  return match ? match[1] : "";
}

export default function EditarObraPessoalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "", description: "", startDate: "", expectedEndDate: "", status: "PLANNING", notes: "",
    cep: "", street: "", addressNumber: "", complement: "", neighborhood: "", city: "", addrState: "",
  });
  const [budgetStr, setBudgetStr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["personal-project", id],
    queryFn: () => api.personalProjects.get(id),
  });

  useEffect(() => {
    if (project && !loaded) {
      const p = project as any;
      const existingAddress = p.address ?? "";
      const cep = extractCep(existingAddress);
      setForm({
        name: p.name ?? "", description: p.description ?? "",
        startDate: p.startDate ? String(p.startDate).slice(0, 10) : "",
        expectedEndDate: p.expectedEndDate ? String(p.expectedEndDate).slice(0, 10) : "",
        status: p.status ?? "PLANNING", notes: p.notes ?? "",
        cep, street: cep ? "" : existingAddress,
        addressNumber: "", complement: "", neighborhood: "", city: "", addrState: "",
      });
      if (p.budgetedAmount != null) setBudgetStr(Number(p.budgetedAmount).toFixed(2));
      setLoaded(true);
    }
  }, [project, loaded]);

  async function fetchCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: "CEP não encontrado", variant: "error" }); return; }
      setForm(prev => ({ ...prev, street: data.logradouro || prev.street, neighborhood: data.bairro || prev.neighborhood, city: data.localidade || prev.city, addrState: data.uf || prev.addrState }));
    } catch { toast({ title: "Erro ao buscar CEP", variant: "error" }); }
    finally { setCepLoading(false); }
  }

  const mutation = useMutation({
    mutationFn: (data: any) => api.personalProjects.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-projects"] });
      qc.invalidateQueries({ queryKey: ["personal-project", id] });
      toast({ title: "Obra atualizada!", variant: "success" });
      router.push(`/obras-pessoais/${id}`);
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "error" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    mutation.mutate({ name: form.name, description: form.description, startDate: form.startDate || null, expectedEndDate: form.expectedEndDate || null, status: form.status, notes: form.notes, address: buildAddress(form), budgetedAmount: budgetStr ? Number(budgetStr) : null });
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (isLoading) return <LoadingPage />;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Editar Obra Pessoal" description="Altere os dados da obra"
        actions={<Button variant="outline" size="sm" asChild><Link href={`/obras-pessoais/${id}`}><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>}
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="space-y-4">
            <Input label="Nome da Obra" required placeholder="Ex: Reforma da cozinha" value={form.name} onChange={f("name")} />

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Endereço</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="CEP" placeholder="00000-000" value={form.cep}
                  onChange={(e) => setForm(prev => ({ ...prev, cep: maskCep(e.target.value) }))}
                  onBlur={(e) => fetchCep(e.target.value)} maxLength={9}
                  rightIcon={cepLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : undefined}
                />
                <Input label="Logradouro (Rua / Av.)" placeholder="Rua das Flores" value={form.street} onChange={f("street")} />
                <Input label="Número" placeholder="123" value={form.addressNumber} onChange={f("addressNumber")} />
                <Input label="Complemento" placeholder="Ap 21, Bloco B..." value={form.complement} onChange={f("complement")} />
                <Input label="Bairro" placeholder="Centro" value={form.neighborhood} onChange={f("neighborhood")} />
                <Input label="Cidade" placeholder="São Paulo" value={form.city} onChange={f("city")} />
                <Select label="Estado" value={form.addrState} onChange={f("addrState")}
                  options={[{ value: "", label: "Selecionar..." }, ...["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s => ({ value: s, label: s }))]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Status" value={form.status} onChange={f("status")}
                options={[{ value: "PLANNING", label: "Planejamento" }, { value: "IN_PROGRESS", label: "Em Andamento" }, { value: "PAUSED", label: "Pausada" }, { value: "COMPLETED", label: "Concluída" }, { value: "CANCELLED", label: "Cancelada" }]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor Previsto</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-gray-500 select-none pointer-events-none">R$</span>
                  <div className="w-full [&_input]:pl-9"><CurrencyInput placeholder="0,00" value={budgetStr} onChange={setBudgetStr} /></div>
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
          <Button variant="outline" type="button" asChild><Link href={`/obras-pessoais/${id}`}>Cancelar</Link></Button>
          <Button type="submit" loading={mutation.isPending}>Salvar Alterações</Button>
        </div>
      </form>
    </div>
  );
}
