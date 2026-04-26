"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import { FileCheck, FileText, Download, Upload, CheckCircle } from "lucide-react";

async function fetchContracts() {
  const res = await fetch("/api/portal/v1/contracts");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data as any[];
}

async function uploadSigned(contractId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/portal/v1/contracts/${contractId}/sign`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-blue-50 text-blue-700",
  SIGNED: "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  SENT: "Aguardando assinatura",
  SIGNED: "Assinado",
};

export default function PortalContratosPage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["portal-contracts"],
    queryFn: fetchContracts,
  });

  async function handleUpload(contractId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(contractId);
    try {
      await uploadSigned(contractId, file);
      queryClient.invalidateQueries({ queryKey: ["portal-contracts"] });
    } catch (err: any) {
      setError(err.message ?? "Erro ao enviar arquivo");
    } finally {
      setUploading(null);
    }
  }

  if (isLoading) return <LoadingPage message="Carregando contratos..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Contratos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Baixe o contrato, assine e envie de volta o arquivo assinado.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum contrato disponível</p>
          <p className="text-sm text-gray-400 mt-1">Os contratos serão disponibilizados aqui quando enviados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract: any) => (
            <div
              key={contract.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  contract.status === "SIGNED" ? "bg-green-50" : "bg-blue-50"
                }`}>
                  {contract.status === "SIGNED" ? (
                    <FileCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{contract.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[contract.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[contract.status] ?? contract.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Nº {contract.number}
                    {contract.projectName && <> · Obra: {contract.projectName}</>}
                    {" · "}Valor: <span className="font-medium text-gray-600">{formatCurrency(contract.totalAmount)}</span>
                  </p>
                  {contract.sentAt && (
                    <p className="text-xs text-gray-400 mt-0.5">Enviado em {formatDate(contract.sentAt)}</p>
                  )}
                  {contract.signedAt && (
                    <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Assinado em {formatDate(contract.signedAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/portal/contratos/${contract.id}/imprimir`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EA580C] hover:text-[#C2410C] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar / Imprimir Contrato
                </a>

                {contract.status === "SENT" && (
                  <>
                    <input
                      ref={(el) => { fileRefs.current[contract.id] = el; }}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(contract.id, e)}
                    />
                    <button
                      onClick={() => fileRefs.current[contract.id]?.click()}
                      disabled={uploading === contract.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading === contract.id ? "Enviando..." : "Enviar Contrato Assinado"}
                    </button>
                  </>
                )}

                {contract.signedFileUrl && (
                  <a
                    href={contract.signedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    Ver Contrato Assinado
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
