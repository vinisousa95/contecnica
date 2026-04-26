"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Printer, Send, FileCheck, Upload, Download } from "lucide-react";
import { LoadingPage } from "@/components/ui/loading";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado ao cliente",
  SIGNED: "Assinado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-50 text-blue-700",
  SIGNED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-500",
};

const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml", DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => api.contracts.get(id) as Promise<any>,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.contracts.update(id, { status: "SENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      toast({ title: "Contrato enviado ao cliente!", variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  async function handleUploadSigned(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload file first
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "document");

      const uploadRes = await fetch("/api/v1/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) throw new Error(uploadJson.error);

      await api.contracts.sign(id, uploadJson.data.url);
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      toast({ title: "Contrato assinado registrado!", variant: "success" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <LoadingPage />;
  if (!contract) return <div className="p-8 text-gray-400">Contrato não encontrado.</div>;

  const serviceItems: any[] = Array.isArray(contract.serviceItems) ? contract.serviceItems : [];
  const paymentSchedule: any[] = Array.isArray(contract.paymentSchedule) ? contract.paymentSchedule : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Contrato ${contract.number}`}
        description={contract.title}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push("/contratos")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <a href={`/contratos/${id}/imprimir`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </Button>
            </a>
            {contract.status === "DRAFT" && (
              <Button onClick={() => sendMutation.mutateAsync().catch(() => {})} loading={sendMutation.isPending}>
                <Send className="h-4 w-4" />
                Enviar ao Cliente
              </Button>
            )}
            {contract.status === "SENT" && (
              <>
                <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleUploadSigned} />
                <Button onClick={() => fileRef.current?.click()} loading={uploading}>
                  <Upload className="h-4 w-4" />
                  Registrar Assinado
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info summary */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[contract.status]}`}>
                {STATUS_LABELS[contract.status]}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Cliente</p>
              <Link href={`/clientes/${contract.client?.id}`} className="text-sm font-medium text-[#EA580C] hover:underline">
                {contract.client?.name}
              </Link>
            </div>
            {contract.project && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Obra</p>
                <Link href={`/obras/${contract.project.id}`} className="text-sm text-gray-700 hover:underline">
                  {contract.project.name}
                </Link>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Valor Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(contract.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Criado em</p>
              <p className="text-sm text-gray-600">{formatDate(contract.createdAt)}</p>
            </div>
            {contract.sentAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Enviado em</p>
                <p className="text-sm text-gray-600">{formatDate(contract.sentAt)}</p>
              </div>
            )}
            {contract.signedAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Assinado em</p>
                <p className="text-sm text-green-600 font-medium">{formatDate(contract.signedAt)}</p>
              </div>
            )}
            {contract.signedFileUrl && (
              <a
                href={contract.signedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#EA580C] hover:underline"
              >
                <FileCheck className="h-4 w-4" />
                Ver contrato assinado
              </a>
            )}
          </CardContent>
        </Card>

        {/* Service items + schedule */}
        <div className="lg:col-span-2 space-y-5">
          {serviceItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens de Serviço</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Descrição</th>
                      <th className="px-4 py-2.5 font-medium w-16">Qtd</th>
                      <th className="px-4 py-2.5 font-medium w-16">Un</th>
                      <th className="px-4 py-2.5 font-medium w-28 text-right">Unit.</th>
                      <th className="px-4 py-2.5 font-medium w-28 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {serviceItems.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-gray-700">{item.name}</td>
                        <td className="px-4 py-3 text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-400">{UNIT_LABELS[item.unit] ?? item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-100 bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-[#EA580C]">{formatCurrency(contract.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}

          {paymentSchedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Condições de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Parcela</th>
                      <th className="px-4 py-2.5 font-medium">Descrição</th>
                      <th className="px-4 py-2.5 font-medium">Vencimento</th>
                      <th className="px-4 py-2.5 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paymentSchedule.map((inst: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-gray-500">{inst.installment}ª</td>
                        <td className="px-4 py-3 text-gray-700">{inst.description || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{inst.dueDate}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(inst.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
