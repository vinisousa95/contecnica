"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type OpType = "FUEL" | "TOLL" | "TRANSPORT";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

export function OperationalCostPage({
  type,
  title,
  description,
  icon: Icon,
}: {
  type: OpType;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const key = ["operational-expenses", type];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch(`/api/v1/operational-expenses?type=${type}`),
  });
  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  const { data: projectsData } = useQuery({
    queryKey: ["projects-select"],
    queryFn: () => api.projects.list({ limit: "100" }) as Promise<any>,
  });
  const projects: any[] = Array.isArray(projectsData) ? projectsData : [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/operational-expenses`, {
        method: "POST",
        body: JSON.stringify({ type, projectId, amount, date, notes: notes || null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      // Reflete na obra (financeiro/despesas).
      if (projectId) qc.invalidateQueries({ queryKey: ["project", projectId] });
      setAmount("");
      setNotes("");
      toast({ title: `${title} lançado`, variant: "success" });
    },
    onError: (e: Error) => toast({ title: "Erro ao lançar", description: e.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/operational-expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Lançamento removido", variant: "success" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao remover", description: e.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return toast({ title: "Selecione a obra", variant: "error" });
    if (!amount) return toast({ title: "Informe o valor", variant: "error" });
    if (!date) return toast({ title: "Informe a data", variant: "error" });
    createMutation.mutate();
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Total</p>
              <p className="text-sm font-bold text-[#EA580C]">{formatCurrency(total)}</p>
            </div>
          </div>
        }
      />

      {/* Form de lançamento */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="lg:col-span-2">
              <Select
                label="Obra"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                options={[
                  { value: "", label: "Selecione a obra" },
                  ...projects.map((p: any) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <CurrencyInput label="Valor (R$)" required placeholder="0,00" value={amount} onChange={setAmount} />
            <Input label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="lg:col-span-3">
              <Input
                label="Observação (opcional)"
                placeholder="Ex: posto Shell, placa do veículo…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" loading={createMutation.isPending} className="w-full">
              <Plus className="h-4 w-4" />
              Lançar
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-3">
            O lançamento entra como despesa (custo interno) da obra — aparece no financeiro e não vai para o cliente.
          </p>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Carregando…</p>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              <Icon className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              Nenhum lançamento de {title.toLowerCase()} ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm text-gray-600">{formatDate(it.date)}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{it.project?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[220px] truncate">{it.notes ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(it.amount)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(it.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remover lançamento"
        description="A despesa correspondente será removida da obra. Deseja continuar?"
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
