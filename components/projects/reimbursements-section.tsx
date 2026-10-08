"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, Send, Undo2, CheckCircle2, Paperclip, Loader2, ExternalLink, Building2,
} from "lucide-react";

/**
 * Reembolso de materiais da obra para a cobrança do cliente, e — em card
 * separado — os custos internos (prestador, administrativo) que são da
 * Contécnica e nunca vão para o cliente.
 *
 * Os dois componentes leem o MESMO endpoint (mesma queryKey): o React Query
 * compartilha o cache, então é uma busca só. Mover um item de um lado para o
 * outro ("Custo interno" / "Voltar para reembolsável") invalida a queryKey e os
 * dois cards se atualizam juntos.
 */

interface Row {
  id: string;
  description: string;
  supplier: string | null;
  category: string | null;
  amount: number;
  dueDate: string;
  hasReceipt: boolean;
  attachmentUrl: string | null;
  billedToClient: boolean;
  billedToClientAt: string | null;
  receiptShared: boolean;
  clientPaid: boolean;
  clientPaidAt: string | null;
  internalCost: boolean;
  isProvider: boolean;
}

const QUERY_KEY = (projectId: string) => ["project-reimbursements", projectId];
const isInternal = (r: Row) => r.internalCost || r.isProvider;

type Filter = "todos" | "nao_enviados" | "aguardando" | "reembolsados";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "nao_enviados", label: "Não enviadas" },
  { value: "aguardando", label: "Aguardando pagamento" },
  { value: "reembolsados", label: "Reembolsadas" },
];

function situacao(r: Row): Filter {
  if (r.clientPaid) return "reembolsados";
  return r.billedToClient ? "aguardando" : "nao_enviados";
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

type PatchBody = { billedToClient?: boolean; receiptShared?: boolean; internalCost?: boolean };

/** Mutação compartilhada: envia/retira cobrança, nota e custo interno. */
function usePatch(projectId: string, onDone: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { expenseIds: string[] } & PatchBody) =>
      apiFetch(`/api/v1/projects/${projectId}/reimbursements`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data: any, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY(projectId) });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      onDone();
      const n = data?.updated ?? vars.expenseIds.length;
      const titulo =
        vars.internalCost === true
          ? `${n} ${n === 1 ? "despesa movida" : "despesas movidas"} para custo interno`
          : vars.internalCost === false
          ? `${n} ${n === 1 ? "despesa devolvida" : "despesas devolvidas"} para reembolsável`
          : vars.billedToClient === true
          ? `${n} ${n === 1 ? "material enviado" : "materiais enviados"} para cobrança`
          : vars.billedToClient === false
          ? `${n} ${n === 1 ? "material retirado" : "materiais retirados"} da cobrança`
          : vars.receiptShared
          ? "Nota liberada para o cliente"
          : "Nota recolhida";
      const semNota = data?.withoutReceipt ?? 0;
      toast({
        title: titulo,
        description: semNota > 0 ? `${semNota} sem nota anexada — anexe na despesa primeiro.` : undefined,
        variant: semNota > 0 ? "default" : "success",
      });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });
}

// ─────────────────────────────────────────────────────────────
// Reembolso de Materiais (cliente)
// ─────────────────────────────────────────────────────────────
export function ReimbursementsSection({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: QUERY_KEY(projectId),
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/reimbursements`),
  });

  const mutation = usePatch(projectId, () => setSelected(new Set()));

  // Custos internos têm card próprio — aqui ficam só os materiais reembolsáveis.
  const materialRows = rows.filter((r) => !isInternal(r));
  const visible = materialRows.filter((r) => filter === "todos" || situacao(r) === filter);
  const selectable = visible.filter((r) => !r.clientPaid);
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const totalPendente = materialRows
    .filter((r) => r.billedToClient && !r.clientPaid)
    .reduce((s, r) => s + r.amount, 0);
  const totalNaoEnviado = materialRows
    .filter((r) => !r.billedToClient && !r.clientPaid)
    .reduce((s, r) => s + r.amount, 0);
  const totalSelecionado = selectedRows.reduce((s, r) => s + r.amount, 0);

  // Lista enxuta: 10 mais recentes (ordenados por data desc na API), com opção
  // de expandir — igual à lista de Despesas.
  const shown = showAll ? visible : visible.slice(0, 10);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === selectable.length ? new Set() : new Set(selectable.map((r) => r.id))
    );
  const apply = (body: PatchBody) => mutation.mutate({ expenseIds: Array.from(selected), ...body });

  const podeEnviar = selectedRows.some((r) => !r.billedToClient);
  const podeRetirar = selectedRows.some((r) => r.billedToClient);
  const podeLiberarNota = selectedRows.some((r) => r.hasReceipt && !r.receiptShared);
  const podeRecolherNota = selectedRows.some((r) => r.receiptShared);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
              Reembolso de Materiais
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({materialRows.length} {materialRows.length === 1 ? "despesa" : "despesas"})
              </span>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Só materiais reembolsáveis pelo cliente. Diárias, prestadores e custos internos
              ficam no card separado abaixo. Só o que for enviado aqui aparece em Cobranças no
              portal do cliente.
            </p>
          </div>
          <div className="flex gap-4 text-right ml-auto">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">A cobrar</p>
              <p className="text-sm font-bold text-amber-600">{formatCurrency(totalPendente)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Não enviado</p>
              <p className="text-sm font-bold text-gray-500">{formatCurrency(totalNaoEnviado)}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === "todos"
              ? materialRows.length
              : materialRows.filter((r) => situacao(r) === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => { setFilter(f.value); setSelected(new Set()); }}
              className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                filter === f.value ? "bg-[#EA580C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="mx-5 mb-3 rounded-lg border border-[#EA580C]/30 bg-orange-50/60 px-4 py-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-gray-700 mr-auto">
            {selected.size} {selected.size === 1 ? "selecionada" : "selecionadas"} ·{" "}
            {formatCurrency(totalSelecionado)}
          </p>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-[#EA580C]" />}
          {podeEnviar && (
            <Button size="sm" disabled={mutation.isPending} onClick={() => apply({ billedToClient: true })}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Enviar para cobrança
            </Button>
          )}
          {podeLiberarNota && (
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => apply({ receiptShared: true })}>
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              Enviar nota ao cliente
            </Button>
          )}
          {podeRecolherNota && (
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => apply({ receiptShared: false })}>
              Recolher nota
            </Button>
          )}
          {podeRetirar && (
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => apply({ billedToClient: false })}>
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Retirar da cobrança
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => apply({ internalCost: true })}
            title="Marca como custo da empresa — vai para o card Custos Internos e nunca para o cliente"
          >
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Custo interno
          </Button>
        </div>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Carregando…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            {materialRows.length === 0
              ? "Nenhum material reembolsável nesta obra."
              : "Nenhuma despesa nesta situação."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas"
                    checked={selectable.length > 0 && selected.size === selectable.length}
                    onChange={toggleAll}
                    disabled={selectable.length === 0}
                    className="h-4 w-4 rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C]"
                  />
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Cobrança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} className={r.billedToClient && !r.clientPaid ? "bg-amber-50/40" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${r.description}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      disabled={r.clientPaid}
                      className="h-4 w-4 rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C] disabled:opacity-40"
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium text-gray-900">{r.description}</span>
                    {r.supplier && <span className="block text-xs text-gray-400">{r.supplier}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{r.category ?? "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(r.dueDate)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.amount)}</TableCell>
                  <TableCell>
                    {!r.hasReceipt ? (
                      <span className="text-xs text-gray-400">Sem nota</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <a
                          href={r.attachmentUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#EA580C] hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Ver
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        {r.receiptShared && (
                          <span className="text-[10px] font-medium bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                            enviada
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.clientPaid ? (
                      <div className="text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reembolsada
                        </span>
                        {r.clientPaidAt && (
                          <span className="block text-gray-400 mt-0.5">{formatDate(r.clientPaidAt)}</span>
                        )}
                      </div>
                    ) : r.billedToClient ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Aguardando pagamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Não enviada
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {visible.length > 10 && (
          <div className="border-t border-gray-100 px-5 py-2.5 text-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-[#EA580C] hover:underline"
            >
              {showAll ? "Ver menos" : `Ver todas as ${visible.length} despesas`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Custos Internos da Obra (NÃO vão para o cliente)
// ─────────────────────────────────────────────────────────────
export function InternalCostsSection({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: QUERY_KEY(projectId),
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/reimbursements`),
  });

  const mutation = usePatch(projectId, () => setSelected(new Set()));

  const internalRows = rows.filter(isInternal);
  // Sem custos internos: não mostra o card (evita seção vazia na obra).
  if (internalRows.length === 0) return null;

  const total = internalRows.reduce((s, r) => s + r.amount, 0);
  // Só os marcados manualmente voltam a ser reembolsáveis (prestador é estrutural).
  const selectable = internalRows.filter((r) => r.internalCost && !r.isProvider && !r.clientPaid);
  const selectedRows = internalRows.filter((r) => selected.has(r.id));
  const shown = showAll ? internalRows : internalRows.slice(0, 10);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === selectable.length ? new Set() : new Set(selectable.map((r) => r.id))
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Custos Internos da Obra
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({internalRows.length} {internalRows.length === 1 ? "despesa" : "despesas"})
              </span>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Custos seus na obra (prestadores, administrativo, etc.). Não vão para o cliente —
              entram só no seu financeiro da obra.
            </p>
          </div>
          <div className="text-right ml-auto">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Total interno</p>
            <p className="text-sm font-bold text-gray-700">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardHeader>

      {selected.size > 0 && (
        <div className="mx-5 mb-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-gray-700 mr-auto">
            {selected.size} {selected.size === 1 ? "selecionada" : "selecionadas"}
          </p>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ expenseIds: Array.from(selected), internalCost: false })}
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Voltar para reembolsável
          </Button>
        </div>
      )}

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas"
                  checked={selectable.length > 0 && selected.size === selectable.length}
                  onChange={toggleAll}
                  disabled={selectable.length === 0}
                  className="h-4 w-4 rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C]"
                />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${r.description}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    disabled={r.isProvider || r.clientPaid}
                    title={r.isProvider ? "Prestador é sempre custo interno" : undefined}
                    className="h-4 w-4 rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C] disabled:opacity-40"
                  />
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium text-gray-900">{r.description}</span>
                  {r.supplier && <span className="block text-xs text-gray-400">{r.supplier}</span>}
                </TableCell>
                <TableCell className="text-sm text-gray-500">{r.category ?? "—"}</TableCell>
                <TableCell className="text-sm text-gray-500">{formatDate(r.dueDate)}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.amount)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    <Building2 className="h-3 w-3" />
                    {r.isProvider ? "Prestador" : "Custo interno"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {internalRows.length > 10 && (
          <div className="border-t border-gray-100 px-5 py-2.5 text-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-[#EA580C] hover:underline"
            >
              {showAll ? "Ver menos" : `Ver todas as ${internalRows.length} despesas`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
