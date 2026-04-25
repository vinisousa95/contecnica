"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  PERSONAL_EXPENSE_CATEGORY_LABELS,
  PERSONAL_EXPENSE_CATEGORY_COLORS,
  PERSONAL_EXPENSE_STATUS_LABELS,
  PERSONAL_EXPENSE_STATUS_COLORS,
  PERSONAL_PAYMENT_METHOD_LABELS,
  PERSONAL_RECURRENCE_LABELS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Trash2, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function GastoPessoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["personal-expense", id],
    queryFn: () => api.personalExpenses.get(id) as Promise<any>,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.personalExpenses.delete(id),
    onSuccess: () => {
      toast({ title: "Gasto excluído", variant: "success" });
      router.push("/gastos-pessoais");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "error" });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => api.personalExpenses.pay(id),
    onSuccess: () => {
      toast({ title: "Pagamento registrado", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["personal-expense", id] });
      queryClient.invalidateQueries({ queryKey: ["personal-expenses"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao registrar pagamento", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!item) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={item.description}
        description="Detalhes do gasto pessoal"
        actions={
          <div className="flex items-center gap-2">
            {item.status !== "PAID" && item.status !== "CANCELED" && (
              <Button
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Marcar como Pago
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/gastos-pessoais/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
            <Button variant="outline" asChild>
              <Link href="/gastos-pessoais">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor</dt>
              <dd className="text-2xl font-bold text-gray-900">{formatCurrency(item.amount)}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${PERSONAL_EXPENSE_STATUS_COLORS[item.status]}`}>
                  {PERSONAL_EXPENSE_STATUS_LABELS[item.status]}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Categoria</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${PERSONAL_EXPENSE_CATEGORY_COLORS[item.category]}`}>
                  {PERSONAL_EXPENSE_CATEGORY_LABELS[item.category]}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Forma de Pagamento</dt>
              <dd className="text-sm text-gray-800">{PERSONAL_PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data do Gasto</dt>
              <dd className="text-sm text-gray-800">
                {item.expenseDate ? new Date(item.expenseDate).toLocaleDateString("pt-BR") : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Vencimento</dt>
              <dd className="text-sm text-gray-800">
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString("pt-BR") : "—"}
              </dd>
            </div>

            {item.paidDate && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data de Pagamento</dt>
                <dd className="text-sm text-gray-800">
                  {new Date(item.paidDate).toLocaleDateString("pt-BR")}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recorrente</dt>
              <dd className="text-sm text-gray-800">
                {item.isRecurring ? PERSONAL_RECURRENCE_LABELS[item.recurrenceType] ?? item.recurrenceType : "Não"}
              </dd>
            </div>

            {item.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observações</dt>
                <dd className="text-sm text-gray-800 whitespace-pre-line">{item.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir gasto pessoal"
        description="Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
