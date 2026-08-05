"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, Send, Undo2, CheckCircle2, Paperclip, Loader2, ExternalLink,
} from "lucide-react";

/**
 * Envio de materiais da obra para a cobrança do cliente.
 *
 * O que o cliente vê em Cobranças sai daqui: enquanto uma despesa não é enviada,
 * ela não aparece para ele. A nota fiscal é uma decisão separada — enviar o valor
 * não expõe o anexo, e liberar a nota também libera o download do arquivo pela
 * sessão do portal (ver app/api/v1/uploads/[...path]/route.ts).
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
}

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

export function ReimbursementsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["project-reimbursements", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/reimbursements`),
  });

  const mutation = useMutation({
    mutationFn: (body: { expenseIds: string[]; billedToClient?: boolean; receiptShared?: boolean }) =>
      apiFetch(`/api/v1/projects/${projectId}/reimbursements`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data: any, vars) => {
      qc.invalidateQueries({ queryKey: ["project-reimbursements", projectId] });
      // O total de Cobranças do cliente muda junto.
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setSelected(new Set());

      const n = data?.updated ?? vars.expenseIds.length;
      const titulo =
        vars.billedToClient === true
          ? `${n} ${n === 1 ? "material enviado" : "materiais enviados"} para cobrança`
          : vars.billedToClient === false
          ? `${n} ${n === 1 ? "material retirado" : "materiais retirados"} da cobrança`
          : vars.receiptShared
          ? "Nota liberada para o cliente"
          : "Nota recolhida";

      // Liberar a nota de uma despesa sem anexo não faz nada de útil — é melhor
      // dizer isso do que deixar o usuário achando que enviou.
      const semNota = data?.withoutReceipt ?? 0;
      toast({
        title: titulo,
        description: semNota > 0 ? `${semNota} sem nota anexada — anexe na despesa primeiro.` : undefined,
        variant: semNota > 0 ? "default" : "success",
      });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });

  const visible = rows.filter((r) => filter === "todos" || situacao(r) === filter);
  const selectable = visible.filter((r) => !r.clientPaid);
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const totalPendente = rows
    .filter((r) => r.billedToClient && !r.clientPaid)
    .reduce((s, r) => s + r.amount, 0);
  const totalNaoEnviado = rows
    .filter((r) => !r.billedToClient && !r.clientPaid)
    .reduce((s, r) => s + r.amount, 0);
  const totalSelecionado = selectedRows.reduce((s, r) => s + r.amount, 0);

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

  const apply = (body: { billedToClient?: boolean; receiptShared?: boolean }) =>
    mutation.mutate({ expenseIds: Array.from(selected), ...body });

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
                ({rows.length} {rows.length === 1 ? "despesa" : "despesas"})
              </span>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Despesas da obra, sem as diárias de funcionário. Só o que for enviado aqui
              aparece em Cobranças no portal do cliente.
            </p>
          </div>
          {/* ml-auto: quando o cabeçalho quebra em tela estreita, os totais
              continuam alinhados à direita em vez de voltarem para a esquerda. */}
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
          const count = f.value === "todos" ? rows.length : rows.filter((r) => situacao(r) === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                filter === f.value
                  ? "bg-[#EA580C] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
        </div>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Carregando…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            {rows.length === 0
              ? "Nenhuma despesa lançada nesta obra."
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
              {visible.map((r) => (
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
      </CardContent>
    </Card>
  );
}
