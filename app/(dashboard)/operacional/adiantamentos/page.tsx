"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2, HandCoins, Wallet } from "lucide-react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

export default function AdiantamentosPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["advances"],
    queryFn: () => apiFetch(`/api/v1/advances`),
  });
  const advances: any[] = data?.advances ?? [];
  const saldo: any[] = (data?.saldo ?? []).filter((s: any) => s.balance > 0.001);

  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees?limit=200");
      const json = await res.json();
      return json.data ?? [];
    },
  });
  const employees: any[] = Array.isArray(employeesData) ? employeesData : [];
  const selectedEmp = employees.find((e) => e.id === employeeId);
  const diarias =
    amount && selectedEmp?.dailyRate ? parseFloat(amount) / Number(selectedEmp.dailyRate) : 0;

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/advances`, {
        method: "POST",
        body: JSON.stringify({ employeeId, amount, date, notes: notes || null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      qc.invalidateQueries({ queryKey: ["advance-balances"] });
      setAmount("");
      setNotes("");
      toast({ title: "Adiantamento registrado", variant: "success" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/advances/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      qc.invalidateQueries({ queryKey: ["advance-balances"] });
      toast({ title: "Adiantamento removido", variant: "success" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast({ title: "Selecione o funcionário", variant: "error" });
    if (!amount) return toast({ title: "Informe o valor", variant: "error" });
    createMutation.mutate();
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Adiantamentos"
        description="Pague diárias antecipadas; o sistema avisa na Equipe da Obra para não pagar de novo"
      />

      {/* Form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="lg:col-span-2">
              <Select
                label="Funcionário"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                options={[
                  { value: "", label: "Selecione o funcionário" },
                  ...employees.map((emp: any) => ({
                    value: emp.id,
                    label: emp.role ? `${emp.name} — ${emp.role}` : emp.name,
                  })),
                ]}
              />
            </div>
            <div>
              <CurrencyInput label="Valor (R$)" required placeholder="0,00" value={amount} onChange={setAmount} />
              {diarias > 0 && (
                <p className="text-xs text-gray-400 mt-1">≈ {diarias.toFixed(diarias % 1 ? 1 : 0)} diária(s)</p>
              )}
            </div>
            <Input label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="lg:col-span-3">
              <Input
                label="Observação (opcional)"
                placeholder="Ex: adiantou 2 diárias da semana"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" loading={createMutation.isPending} className="w-full">
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Saldo por funcionário */}
      {saldo.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-[#EA580C]" /> Saldo a abater
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saldo.map((s) => (
              <Card key={s.employeeId}>
                <CardContent className="py-3.5">
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    Adiantado {formatCurrency(s.advanced)} · abatido {formatCurrency(s.consumed)}
                  </p>
                  <p className="text-lg font-bold text-[#EA580C] mt-1">{formatCurrency(s.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Carregando…</p>
          ) : advances.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              <HandCoins className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              Nenhum adiantamento registrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm text-gray-600">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{a.employee?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[220px] truncate">{a.notes ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(a.amount)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(a.id)}
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
        title="Remover adiantamento"
        description="Remover este adiantamento? O saldo do funcionário será recalculado."
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
