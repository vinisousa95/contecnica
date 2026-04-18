"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { usePortalDocuments } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { FileText, Download, FileCheck, File } from "lucide-react";

const TYPE_ICON: Record<string, any> = {
  CONTRACT: FileCheck,
  BUDGET: FileText,
  INVOICE: File,
  REPORT: FileText,
  OTHER: File,
};

const TYPE_COLOR: Record<string, string> = {
  CONTRACT: "bg-blue-50 text-blue-600",
  BUDGET: "bg-green-50 text-green-600",
  INVOICE: "bg-purple-50 text-purple-600",
  REPORT: "bg-amber-50 text-amber-600",
  OTHER: "bg-gray-50 text-gray-600",
};

export default function PortalDocumentosPage() {
  const { projectId } = usePortal();
  const { data: documents = [], isLoading } = usePortalDocuments(projectId ?? "");

  if (!projectId || isLoading) return <LoadingPage message="Carregando documentos..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">{documents.length} documento{documents.length !== 1 ? "s" : ""} disponível{documents.length !== 1 ? "s" : ""}</p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum documento ainda</p>
          <p className="text-sm text-gray-400 mt-1">Documentos serão disponibilizados aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {documents.map((doc: any) => {
            const Icon = TYPE_ICON[doc.type] ?? File;
            const colorClass = TYPE_COLOR[doc.type] ?? TYPE_COLOR.OTHER;
            return (
              <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{doc.typeLabel} · Adicionado em {formatDate(doc.createdAt)}</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#EA580C] hover:text-[#C2410C] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
