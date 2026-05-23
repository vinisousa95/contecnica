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
import { ArrowLeft, Plus } from "lucide-react";

export default function EditarObraParceriaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "", buyerId: "", address: "", description: "",
    startDate: "", expectedEndDate: "", status: "PLANNING", notes: "",
  });
  const [budgetStr, setBudgetStr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["partnership-project", id],
    queryFn: () => api.partnershipProjects.get(id),
  });

  const { data: buyersRaw } = useQuery({
    queryKey: ["partnership-buyers"],
    queryFn: () => api.partnershipBuyers.list(),
  });
  const buyers: any[] = Array.isArray(buyersRaw) ? buyersRaw : (buyersRaw as any)?.data ?? [];

  useEffect(() => {
    if (project && !loaded) {
      const p = project as any;
      setForm({
        name: p.name ?? "",
        buyerId: p.buyerId ?? "",
        address: p.address ?? "",
        description: p.description ?? "",
        startDate: p.startDate ? String(p.startDate).slice(0, 10) : "",
        expectedEndDate: p.expectedEndDate ? String(p.expectedEndDate).slice(0, 10) : "",
        status: p.status ?? "PLANNING",
        notes: p.notes ?? "",
      });
      if (p.budgetedAmount != null) setBudgetStr(Number(p.budgetedAmount).toFixed(2));
      setLoaded(true);
    }
  }, [project, loaded]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.partnershipProjects.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership-projects"] });
      qc.invalidateQueries({ queryKey: ["partnership-project", id] });
      toast({ title: "Obra atualizada com sucesso!", variant: "success" });
      router.push(`/obras-parcerias/${id}`);
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "error" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    if (!form.buyerId) return toast({ title: "Selecione um comprador/parceiro", variant: "error" });
    mutation.mutate({
      ...form,
      budgetedAmount: budgetStr ? Number(budgetStr) : null,
      startDate: form.startDate || null,
      expectedEndDate: form.expectedEndDate || null,
    });
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loadingProject) return <LoadingPage />;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Editar Obra Parceria"
        description="Altere os dados da obra parceria"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/obras-parcerias/${id}`}><ArrowLeft className="h-4 w-4" />Voltar</Link>
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

              <div className="sm:col-span-2">
                <Input label="Endereço" placeholder="Rua, número, bairro..." value={form.address} onChange={f("address")} />
              </div>

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

              <CurrencyInput label="Valor Previsto (R$)" placeholder="0,00" value={budgetStr} onChange={setBudgetStr} />

              <Input label="Data de Início" type="date" value={form.startDate} onChange={f("startDate")} />
              <Input label="Previsão de Término" type="date" value={form.expectedEndDate} onChange={f("expectedEndDate")} />
            </div>

            <Textarea label="Descrição" placeholder="Descrição da obra..." value={form.description} onChange={f("description") as any} rows={2} />
            <Textarea label="Observações" placeholder="Observações adicionais..." value={form.notes} onChange={f("notes") as any} rows={2} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href={`/obras-parcerias/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" loading={mutation.isPending}>Salvar Alterações</Button>
        </div>
      </form>
    </div>
  );
}
