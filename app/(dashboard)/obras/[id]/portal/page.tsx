"use client";

import { useState, useRef, useEffect, use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Clock, Image, FileText, Upload, X } from "lucide-react";
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

async function uploadFile(file: File, type: "photo" | "document"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
  const text = await res.text();
  if (!text) throw new Error(`Servidor retornou resposta vazia (status ${res.status})`);
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Resposta inválida do servidor (status ${res.status})`); }
  if (!res.ok) throw new Error(json.error ?? "Erro no upload");
  return json.data.url;
}

type Tab = "updates" | "photos" | "documents";
const updateSchema = z.object({ title: z.string().min(2), description: z.string().optional() });
type UpdateForm = z.infer<typeof updateSchema>;
const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contrato", BUDGET: "Orçamento", INVOICE: "Nota Fiscal", REPORT: "Relatório", OTHER: "Outro",
};

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
      <Button type="submit" loading={isSubmitting} className="w-full"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
    </form>
  );
}

function AddPhotoForm({ projectId, tasks: tasksProp, onSuccess }: { projectId: string; tasks: any[]; onSuccess: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [localTasks, setLocalTasks] = useState<any[]>(tasksProp);

  // re-fetch tasks directly every time the form mounts, regardless of parent query state
  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/tasks`, { headers: { "Content-Type": "application/json" } })
      .then(r => r.json()).then(j => { if (Array.isArray(j.data)) setLocalTasks(j.data); }).catch(() => {});
  }, [projectId]);

  const tasks = localTasks;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).filter(f => f.type.startsWith("image/")).slice(0, 10);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { toast({ title: "Selecione ao menos uma foto", variant: "error" }); return; }
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file, "photo");
        await apiFetch(`/api/v1/projects/${projectId}/photos`, {
          method: "POST",
          body: JSON.stringify({ imageUrl: url, description: description || undefined, taskId: taskId || null }),
        });
      }
      toast({ title: `${files.length} foto(s) adicionada(s)` });
      setFiles([]); setPreviews([]); setDescription(""); setTaskId("");
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Nova(s) Foto(s)</p>

      {/* task selector FIRST — always visible */}
      <div style={{ background: "#fff7ed", border: "1px solid #fb923c", borderRadius: 8, padding: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#c2410c", marginBottom: 6 }}>
          Vincular ao item de execução {tasks.length === 0 ? "(nenhum item cadastrado)" : `(${tasks.length} disponíveis)`}
        </label>
        <select
          value={taskId}
          onChange={e => setTaskId(e.target.value)}
          style={{ width: "100%", fontSize: 14, border: "1px solid #fdba74", borderRadius: 8, padding: "6px 10px", background: "#fff" }}
        >
          <option value="">— Sem vínculo —</option>
          {tasks.map((t: any) => (
            <option key={t.id} value={t.id}>{t.isCompleted ? "✓ " : ""}{t.name}</option>
          ))}
        </select>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#EA580C] hover:bg-orange-50 transition-colors"
      >
        <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Clique ou arraste as fotos aqui</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — máx 10MB cada</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Input
        label="Descrição (opcional)"
        placeholder="Ex: Demolição do piso"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button type="submit" loading={uploading} className="w-full" disabled={files.length === 0}>
        <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : `Enviar ${files.length > 0 ? `(${files.length})` : ""}`}
      </Button>
    </form>
  );
}

function AddDocForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast({ title: "Selecione um arquivo", variant: "error" }); return; }
    if (!name.trim()) { toast({ title: "Informe o nome do documento", variant: "error" }); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file, "document");
      await apiFetch(`/api/v1/projects/${projectId}/documents`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), fileUrl: url, type: docType }),
      });
      toast({ title: "Documento adicionado" });
      setFile(null); setName(""); setDocType("OTHER");
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Novo Documento</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#EA580C] hover:bg-orange-50 transition-colors"
      >
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-[#EA580C]" />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{file.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Clique ou arraste o arquivo aqui</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — máx 10MB</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </div>
      <Input label="Nome do documento *" placeholder="Ex: Contrato de Serviço" value={name} onChange={e => setName(e.target.value)} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
        <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]">
          {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Button type="submit" loading={uploading} className="w-full" disabled={!file}>
        <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : "Enviar documento"}
      </Button>
    </form>
  );
}

export default function ProjectPortalPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("updates");

  const { data: updates = [] } = useQuery({ queryKey: ["project-updates", params.id], queryFn: () => apiFetch(`/api/v1/projects/${params.id}/updates`) });
  const { data: photos = [] } = useQuery({ queryKey: ["project-photos", params.id], queryFn: () => apiFetch(`/api/v1/projects/${params.id}/photos`) });
  const { data: documents = [] } = useQuery({ queryKey: ["project-documents", params.id], queryFn: () => apiFetch(`/api/v1/projects/${params.id}/documents`) });
  const { data: tasks = [] } = useQuery({ queryKey: ["project-tasks", params.id], queryFn: () => apiFetch(`/api/v1/projects/${params.id}/tasks`) });

  const deleteUpdate = async (id: string) => { await apiFetch(`/api/v1/projects/${params.id}/updates/${id}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["project-updates", params.id] }); toast({ title: "Atualização removida" }); };
  const togglePhotoVisible = async (id: string, visible: boolean) => { await apiFetch(`/api/v1/projects/${params.id}/photos/${id}`, { method: "PUT", body: JSON.stringify({ visible: !visible }) }); qc.invalidateQueries({ queryKey: ["project-photos", params.id] }); };
  const deletePhoto = async (id: string) => { await apiFetch(`/api/v1/projects/${params.id}/photos/${id}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["project-photos", params.id] }); toast({ title: "Foto removida" }); };
  const toggleDocVisible = async (id: string, visible: boolean) => { await apiFetch(`/api/v1/projects/${params.id}/documents/${id}`, { method: "PUT", body: JSON.stringify({ visible: !visible }) }); qc.invalidateQueries({ queryKey: ["project-documents", params.id] }); };
  const deleteDoc = async (id: string) => { await apiFetch(`/api/v1/projects/${params.id}/documents/${id}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["project-documents", params.id] }); toast({ title: "Documento removido" }); };

  const tabs = [
    { key: "updates" as Tab, label: "Atualizações", icon: Clock, count: updates.length },
    { key: "photos" as Tab, label: "Fotos", icon: Image, count: photos.length },
    { key: "documents" as Tab, label: "Documentos", icon: FileText, count: documents.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/obras/${params.id}`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        </Link>
        <PageHeader title="Portal do Cliente — Conteúdo" description="Gerencie atualizações, fotos e documentos visíveis ao cliente [v3]" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-[#EA580C] text-white" : "bg-gray-200 text-gray-600"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "updates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {updates.length === 0 ? (
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
                    <button onClick={() => deleteUpdate(u.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <AddUpdateForm projectId={params.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["project-updates", params.id] })} />
        </div>
      )}

      {tab === "photos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {photos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Nenhuma foto ainda</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p: any) => (
                  <div key={p.id} className="relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm aspect-square group">
                    <img src={p.imageUrl} alt={p.description ?? "Foto"} className="w-full h-full object-cover" />
                    {!p.visible && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><EyeOff className="h-6 w-6 text-white" /></div>}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => togglePhotoVisible(p.id, p.visible)} className="bg-white rounded-lg p-1.5 shadow hover:bg-gray-50">
                        {p.visible ? <Eye className="h-3.5 w-3.5 text-gray-600" /> : <EyeOff className="h-3.5 w-3.5 text-gray-600" />}
                      </button>
                      <button onClick={() => deletePhoto(p.id)} className="bg-white rounded-lg p-1.5 shadow hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                    </div>
                    {(p.description || p.task) && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        {p.task && <p className="text-[#EA580C] text-[10px] font-semibold truncate">{p.task.name}</p>}
                        {p.description && <p className="text-white text-xs truncate">{p.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <AddPhotoForm
            projectId={params.id}
            tasks={tasks}
            onSuccess={() => qc.invalidateQueries({ queryKey: ["project-photos", params.id] })}
          />
        </div>
      )}

      {tab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {documents.length === 0 ? (
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
                      <button onClick={() => deleteDoc(d.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
