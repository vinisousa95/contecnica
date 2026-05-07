"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  FileText,
  Printer,
  Package,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  UNDER_REVIEW: "Em Revisão",
  SENT: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  UNDER_REVIEW: "warning",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
};

const TIER_LABELS: Record<string, string> = {
  HIGH: "Preço Alto",
  MEDIUM: "Preço Médio",
  LOW: "Preço Baixo",
};

const CATEGORY_LABELS: Record<string, string> = {
  DEMOLITION: "Demolição",
  PAINTING: "Pintura",
  MASONRY: "Alvenaria",
  ELECTRICAL: "Elétrica",
  PLUMBING: "Hidráulica",
  FINISHING: "Acabamento",
  CLEANING: "Limpeza",
  JOINERY: "Marcenaria",
  TILING: "Revestimentos",
  CARPENTRY: "Carpintaria",
  OTHERS: "Outros",
  AMBIENTES: "Ambientes Completos",
};

const UNIT_LABELS: Record<string, string> = {
  UNIT: "un",
  SQM: "m²",
  M: "m",
  DAILY: "diária",
  SERVICE: "serviço",
  POINT: "ponto",
  HOUR: "hora",
};

const NEXT_STATUS: Record<string, { label: string; next: string; variant: ButtonVariant }[]> = {
  DRAFT: [{ label: "Enviar para Revisão", next: "UNDER_REVIEW", variant: "warning" }],
  UNDER_REVIEW: [
    { label: "Marcar como Enviado", next: "SENT", variant: "default" },
    { label: "Voltar a Rascunho", next: "DRAFT", variant: "outline" },
  ],
  SENT: [
    { label: "Aprovar", next: "APPROVED", variant: "success" },
    { label: "Recusar", next: "REJECTED", variant: "destructive" },
  ],
  APPROVED: [{ label: "Reverter para Enviado", next: "SENT", variant: "outline" }],
  REJECTED: [{ label: "Reabrir como Rascunho", next: "DRAFT", variant: "outline" }],
  CANCELLED: [{ label: "Reabrir como Rascunho", next: "DRAFT", variant: "outline" }],
};

type ButtonVariant = "default" | "outline" | "success" | "warning" | "destructive";

export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: budget, isLoading } = useQuery({
    queryKey: ["budget", id],
    queryFn: () => api.budgets.get(id) as Promise<any>,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.budgets.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget", id] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Status atualizado", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar status", description: err.message, variant: "error" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => api.budgets.duplicate(id) as Promise<any>,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento duplicado!", variant: "success" });
      router.push(`/orcamentos/${result?.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.budgets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Orçamento excluído", variant: "success" });
      router.push("/orcamentos");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!budget) return null;

  const nextActions = NEXT_STATUS[budget.status] ?? [];

  // Group catalog items by category (packages go under AMBIENTES)
  const itemsByCategory = (budget.items ?? []).reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.reformPackageId ? "AMBIENTES" : (item.reformItem?.category ?? "OTHERS");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const addressParts = [
    budget.street && `${budget.street}${budget.number ? `, ${budget.number}` : ""}`,
    budget.complement,
    budget.neighborhood,
    budget.city && budget.state ? `${budget.city} - ${budget.state}` : budget.city,
    budget.zipCode,
  ].filter(Boolean);

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <Badge variant={STATUS_VARIANTS[budget.status]}>{STATUS_LABELS[budget.status]}</Badge>
        <span className="text-xs font-mono text-gray-400">{budget.code}</span>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        <span className="text-xs text-gray-500">{TIER_LABELS[budget.tier]}</span>
      </div>
      <PageHeader
        title={budget.title}
        description={`${budget.code} · ${TIER_LABELS[budget.tier]}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Next status actions */}
            {nextActions.map((action) => (
              <Button
                key={action.next}
                variant={action.variant as any}
                size="sm"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(action.next)}
              >
                {action.next === "APPROVED" && <CheckCircle className="h-4 w-4" />}
                {action.next === "REJECTED" && <XCircle className="h-4 w-4" />}
                {action.next === "SENT" && <Send className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}

            <Button variant="outline" size="sm" asChild>
              <Link href={`/orcamentos/${id}/imprimir`} target="_blank">
                <Printer className="h-4 w-4" />
                Exportar PDF
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              loading={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>

            {budget.status !== "APPROVED" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/orcamentos/${id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}

            {budget.status !== "APPROVED" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" size="sm" asChild>
              <Link href="/orcamentos">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Catalog items */}
          {Object.keys(itemsByCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Itens do Catálogo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(Object.entries(itemsByCategory) as [string, any[]][]).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item: any) => {
                          const isPkg = !!item.reformPackageId;
                          const name = isPkg
                            ? (item.reformPackage?.name ?? item.name ?? "Ambiente")
                            : (item.reformItem?.name ?? item.name ?? "Item");
                          const desc = isPkg
                            ? (item.reformPackage?.items ?? []).map((i: any) => i.name).filter(Boolean).join(", ")
                            : item.reformItem?.description;
                          const unitLabel = isPkg ? "serviço" : UNIT_LABELS[item.reformItem?.unit ?? "UNIT"];
                          return (
                          <tr key={item.id} className="px-5">
                            <td className="px-5 py-2.5">
                              <p className="font-medium text-gray-900">{name}</p>
                              {desc && <p className="text-xs text-gray-500">{desc}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">
                              {Number(item.quantity).toLocaleString("pt-BR")} {unitLabel}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Extra items */}
          {(budget.extraItems ?? []).length > 0 && (() => {
            const roomMap = new Map<string, any[]>();
            (budget.extraItems ?? []).forEach((e: any) => {
              const room = e.room ?? "";
              if (!roomMap.has(room)) roomMap.set(room, []);
              roomMap.get(room)!.push(e);
            });
            const ungrouped = roomMap.get("") ?? [];
            const namedRooms = [...roomMap.entries()].filter(([k]) => k !== "");
            const renderUngroupedRows = (items: any[]) => items.map((e: any) => (
              <tr key={e.id}>
                <td className="px-5 py-2.5">
                  <p className="font-medium text-gray-900">{e.name}</p>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {Number(e.quantity).toLocaleString("pt-BR")} {UNIT_LABELS[e.unit]}
                </td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(e.subtotal)}</td>
              </tr>
            ));
            const renderRoomRows = (items: any[]) => items.map((e: any) => (
              <tr key={e.id}>
                <td className="px-5 py-2.5">
                  <p className="font-medium text-gray-900">{e.name}</p>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {Number(e.quantity).toLocaleString("pt-BR")} {UNIT_LABELS[e.unit]}
                </td>
                <td className="px-5 py-2.5"></td>
              </tr>
            ));
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Itens Extras
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-2 text-left font-medium text-gray-600">Item</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Qtd</th>
                        <th className="px-5 py-2 text-right font-medium text-gray-600">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ungrouped.length > 0 && renderUngroupedRows(ungrouped)}
                      {namedRooms.map(([room, items]) => {
                        const roomTotal = items.reduce((s: number, e: any) => s + Number(e.subtotal), 0);
                        return (
                          <>
                            <tr key={`room-${room}`}>
                              <td colSpan={3} className="px-5 py-1.5 bg-orange-50 text-xs font-semibold text-orange-700 uppercase tracking-wide">
                                {room}
                              </td>
                            </tr>
                            {renderRoomRows(items)}
                            <tr key={`room-total-${room}`} className="border-t border-gray-100 bg-gray-50">
                              <td colSpan={2} className="px-5 py-2 text-right text-xs font-semibold text-gray-600">
                                Total {room}:
                              </td>
                              <td className="px-5 py-2 text-right font-bold text-gray-900">{formatCurrency(roomTotal)}</td>
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })()}

          {/* Notes */}
          {budget.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{budget.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Itens catálogo:</span>
                <span className="font-medium text-blue-800">
                  {formatCurrency(
                    (budget.items ?? []).reduce((s: number, i: any) => s + Number(i.subtotal), 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Itens extras:</span>
                <span className="font-medium text-blue-800">
                  {formatCurrency(
                    (budget.extraItems ?? []).reduce((s: number, e: any) => s + Number(e.subtotal), 0)
                  )}
                </span>
              </div>
              {Number(budget.discount) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Subtotal:</span>
                    <span className="font-medium text-blue-800">
                      {formatCurrency(
                        (budget.items ?? []).reduce((s: number, i: any) => s + Number(i.subtotal), 0) +
                        (budget.extraItems ?? []).reduce((s: number, e: any) => s + Number(e.subtotal), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Desconto ({Number(budget.discount)}%):</span>
                    <span className="font-medium">
                      − {formatCurrency(
                        ((budget.items ?? []).reduce((s: number, i: any) => s + Number(i.subtotal), 0) +
                        (budget.extraItems ?? []).reduce((s: number, e: any) => s + Number(e.subtotal), 0)) *
                        (Number(budget.discount) / 100)
                      )}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-blue-200 pt-3 flex justify-between">
                <span className="font-semibold text-blue-800">Total:</span>
                <span className="text-xl font-bold text-blue-900">
                  {formatCurrency(budget.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">{budget.client?.name}</p>
                </div>
              </div>

              {addressParts.length > 0 && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Endereço da obra</p>
                    <p className="text-gray-700">{addressParts.join(", ")}</p>
                  </div>
                </div>
              )}

              {budget.validUntil && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Válido até</p>
                    <p className="text-gray-700">{formatDate(budget.validUntil)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Criado em</p>
                  <p className="text-gray-700">{formatDate(budget.createdAt)}</p>
                </div>
              </div>

              {budget.createdBy && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Criado por</p>
                    <p className="text-gray-700">{budget.createdBy.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir orçamento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
