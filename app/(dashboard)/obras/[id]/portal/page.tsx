"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Clock, Image, FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

type Tab = "updates" | "photos" | "documents";

// ── Schemas ──────────────────────────────────────
const updateSchema = z.object({ title: z.string().min(2), description: z.string().optional() });
const photoSchema = z.object({ imageUrl: z.string().url("URL inválida"), description: z.string().optional() });
const docSchema = z.object({
  name: z.string().min(2),
  fileUrl: z.string().url("URL inválida"),
  type: z.enum(["CONTRACT", "BUDGET", "INVOICE", "REPORT", "OTHER"]),
});

type UpdateForm = z.infer<typeof updateSchema>;
type PhotoForm = z.infer<typeof photoSchema>;
type DocForm = z.infer<typeof docSchema>;

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contrato", BUDGET: "Orçamento", INVOICE: "Nota Fiscal", REPORT: "Relatório", OTHER: "Outro",
};

// ── Components ────────────────────────────────────
function AddUpdateForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UpdateForm>({ resolver: zodResolver(updateSchema) });
  const onSubmit = async (data: UpdateForm) => {
    await apiFetch(`/api/v1/projects/${projectId}/updates`, { method: "POST", body: JSON.stringify(data) });
    toast({ title: "Atualização adicionada" });
    reset();
    onSuccess();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Nova Atualização</p>
      <Input label="Título *" placeholder="Ex: Demolição concluída" error={errors.title?.message} {...register("title")} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
        <textarea {...register("description")} rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none" placeholder="Descreva o que foi feito..." />
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Adicionar
      </Button>
    </form>
  );
}

function AddPhotoForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PhotoForm>({ resolver: zodResolver(photoSchema) });
  const onSubmit = async (data: PhotoForm) => {
    await apiFetch(`/api/v1/projects/${projectId}/photos`, { method: "POST", body: JSON.stringify(data) });
    toast({ title: "Foto adicionada" });
    reset();
    onSuccess();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Nova Foto</p>
      <Input label="URL da imagem *" placeholder="https://..." error={errors.imageUrl?.message} {...register("imageUrl")} />
      <Input label="Descrição (opcional)" placeholder="Descrição da foto" {...register("description")} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Adicionar
      </Button>
    </form>
  );
}

function AddDocForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DocForm>({ resolver: zodResolver(docSchema) });
  const onSubmit = async (data: DocForm) => {
    await apiFetch(`/api/v1/projects/${projectId}/documents`, { method: "POST", body: JSON.stringify(data) });
    toast({ title: "Documento adicionado" });
    reset();
    onSuccess();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Novo Documento</p>
      <Input label="Nome *" placeholder="Ex: Contrato de Serviço" error={errors.name?.message} {...register("name")} />
      <Input label="URL do arquivo *" placeholder="https://..." error={errors.fileUrl?.message} {...register("fileUrl")} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
        <select {...register("type")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
          {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Adicionar
      </Button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────
export default function ProjectPortalPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("updates");

  const { data: updates = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ["project-updates", params.id],
    queryFn: () => apiFetch(`/api/v1/projects/${params.id}/updates`),
  });
  const { data: photos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ["project-photos", params.id],
    queryFn: () => apiFetch(`/api/v1/projects/${params.id}/photos`),
  });
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["project-documents", params.id],
    queryFn: () => apiFetch(`/api/v1/projects/${params.id}/documents`),
  });

  const deleteUpdate = async (updateId: string) => {
    await apiFetch(`/api/v1/projects/${params.id}/updates/${updateId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["project-updates", params.id] });
    toast({ title: "Atualização removida" });
  };

  const togglePhotoVisible = async (photoId: string, visible: boolean) => {
    await apiFetch(`/api/v1/projects/${params.id}/photos/${photoId}`, { method: "PUT", body: JSON.stringify({ visible: !visible }) });
    qc.invalidateQueries({ queryKey: ["project-photos", params.id] });
  };

  const deletePhoto = async (photoId: string) => {
    await apiFetch(`/api/v1/projects/${params.id}/photos/${photoId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["project-photos", params.id] });
    toast({ title: "Foto removida" });
  };

  const toggleDocVisible = async (docId: string, visible: boolean) => {
    await apiFetch(`/api/v1/projects/${params.id}/documents/${docId}`, { method: "PUT", body: JSON.stringify({ visible: !visible }) });
    qc.invalidateQueries({ queryKey: ["project-documents", params.id] });
  };

  const deleteDoc = async (docId: string) => {
    await apiFetch(`/api/v1/projects/${params.id}/documents/${docId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["project-documents", params.id] });
    toast({ title: "Documento removido" });
  };

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "updates", label: "Atualizações", icon: Clock, count: updates.length },
    { key: "photos", label: "Fotos", icon: Image, count: photos.length },
    { key: "documents", label: "Documentos", icon: FileText, count: documents.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/obras/${params.id}`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        </Link>
        <PageHeader title="Portal do Cliente — Conteúdo" description="Gerencie atualizações, fotos e documentos visíveis ao cliente" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-[#EA580C] text-white" : "bg-gray-200 text-gray-600"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Updates Tab */}
      {tab === "updates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {loadingUpdates ? <LoadingPage /> : updates.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Nenhuma atualização ainda</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {updates.map((u: any) => (
                  <div key={u.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="w-2 h-2 rounded-full bg-[#EA580C] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{u.title}</p>
                      {u.description && <p className="text-xs text-gray-500 mt-0.5">{u.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(u.createdAt)}</p>
                    </div>
                    <button onClick={() => deleteUpdate(u.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <AddUpdateForm projectId={params.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["project-updates", params.id] })} />
        </div>
      )}

      {/* Photos Tab */}
      {tab === "photos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loadingPhotos ? <LoadingPage /> : photos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Nenhuma foto ainda</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p: any) => (
                  <div key={p.id} className="relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm aspect-square group">
                    <img src={p.imageUrl} alt={p.description ?? "Foto"} className="w-full h-full object-cover" />
                    {!p.visible && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <EyeOff className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => togglePhotoVisible(p.id, p.visible)} className="bg-white rounded-lg p-1.5 shadow hover:bg-gray-50">
                        {p.visible ? <Eye className="h-3.5 w-3.5 text-gray-600" /> : <EyeOff className="h-3.5 w-3.5 text-gray-600" />}
                      </button>
                      <button onClick={() => deletePhoto(p.id)} className="bg-white rounded-lg p-1.5 shadow hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    {p.description && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-xs truncate">{p.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <AddPhotoForm projectId={params.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["project-photos", params.id] })} />
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loadingDocs ? <LoadingPage /> : documents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Nenhum documento ainda</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {documents.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[d.type]} · {formatDate(d.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleDocVisible(d.id, d.visible)} className={`p-1.5 rounded-lg transition-colors ${d.visible ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}>
                        {d.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deleteDoc(d.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <AddDocForm projectId={params.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["project-documents", params.id] })} />
        </div>
      )}
    </div>
  );
}
