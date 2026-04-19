"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Pencil,
  ChevronDown, ChevronRight, User, Calendar, Flag, X,
} from "lucide-react";

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  LOW: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "COMPLETED", label: "Concluída" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas as prioridades" },
  { value: "URGENT", label: "Urgente" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
  { value: "LOW", label: "Baixa" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "IN_PROGRESS") return <Clock className="h-4 w-4 text-blue-500" />;
  return <Circle className="h-4 w-4 text-gray-300" />;
}

export default function TarefasPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin-tasks", filterStatus, filterPriority, filterProject],
    queryFn: () => {
      const params = new URLSearchParams({ parentOnly: "true" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterProject) params.set("projectId", filterProject);
      return apiFetch(`/api/v1/tasks?${params}`);
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-simple"],
    queryFn: () => apiFetch("/api/v1/projects?limit=200"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-employees"],
    queryFn: () => apiFetch("/api/v1/users?limit=100"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tasks"] });
      toast({ title: "Tarefa removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });

  const updateStatus = async (taskId: string, status: string) => {
    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      qc.invalidateQueries({ queryKey: ["admin-tasks"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const projectOptions = [
    { value: "", label: "Todas as obras" },
    ...(Array.isArray(projects) ? projects : []).map((p: any) => ({ value: p.id, label: p.name })),
  ];

  const taskList = Array.isArray(tasks) ? tasks : [];
  const pending = taskList.filter((t: any) => t.status === "PENDING").length;
  const inProgress = taskList.filter((t: any) => t.status === "IN_PROGRESS").length;
  const completed = taskList.filter((t: any) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Execução de Tarefas"
        description="Gerencie e acompanhe as tarefas das obras"
        actions={
          <Button onClick={() => { setEditTask(null); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendentes", value: pending, color: "text-gray-600 bg-gray-50", border: "border-gray-200" },
          { label: "Em andamento", value: inProgress, color: "text-blue-700 bg-blue-50", border: "border-blue-200" },
          { label: "Concluídas", value: completed, color: "text-green-700 bg-green-50", border: "border-green-200" },
        ].map(({ label, value, color, border }) => (
          <Card key={label} className={`border ${border}`}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${color.split(" ")[0]}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          className="sm:w-52"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          options={projectOptions}
        />
        <Select
          className="sm:w-44"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Select
          className="sm:w-44"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          options={PRIORITY_OPTIONS}
        />
      </div>

      {/* Task list */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-gray-400">Carregando tarefas...</CardContent></Card>
      ) : taskList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhuma tarefa encontrada</p>
            <p className="text-xs text-gray-400 mt-1">Crie uma nova tarefa clicando em "Nova Tarefa".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {taskList.map((task: any) => {
            const isExpanded = expanded.has(task.id);
            const hasChildren = task.children?.length > 0;
            const doneChildren = task.children?.filter((c: any) => c.status === "COMPLETED").length ?? 0;

            return (
              <Card key={task.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status toggle */}
                    <button
                      onClick={() => {
                        const next = task.status === "PENDING" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
                        updateStatus(task.id, next);
                      }}
                      className="mt-0.5 flex-shrink-0"
                      title="Alterar status"
                    >
                      <StatusIcon status={task.status} />
                    </button>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${task.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {task.name}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority === "URGENT" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-400">
                        {task.project && (
                          <span className="font-medium text-gray-600">{task.project.name}</span>
                        )}
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignee.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {hasChildren && (
                          <span className="text-gray-400">{doneChildren}/{task.children.length} subtarefas</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => { setEditTask(task); setShowModal(true); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Remover tarefa?")) deleteMutation.mutate(task.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {isExpanded && hasChildren && (
                  <div className="border-t border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
                    {task.children.map((child: any) => (
                      <div key={child.id} className="px-4 py-3 flex items-center gap-3 pl-11">
                        <button onClick={() => {
                          const next = child.status === "PENDING" ? "IN_PROGRESS" : child.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
                          updateStatus(child.id, next);
                        }} className="flex-shrink-0">
                          <StatusIcon status={child.status} />
                        </button>
                        <span className={`text-sm flex-1 ${child.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {child.name}
                        </span>
                        {child.assignee && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {child.assignee.name}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[child.status]}`}>
                          {STATUS_LABELS[child.status]}
                        </span>
                      </div>
                    ))}
                    <div className="px-4 py-2 pl-11">
                      <button
                        onClick={() => { setEditTask({ parentId: task.id, projectId: task.projectId, _addSubtask: true }); setShowModal(true); }}
                        className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar subtarefa
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <TaskModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        editTask={editTask}
        projects={Array.isArray(projects) ? projects : []}
        users={Array.isArray(users) ? users : []}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-tasks"] });
          setShowModal(false);
          setEditTask(null);
        }}
      />
    </div>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
interface SubtaskInput { name: string; assigneeId: string; }

function TaskModal({
  open, onClose, editTask, projects, users, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editTask: any | null;
  projects: any[];
  users: any[];
  onSaved: () => void;
}) {
  const isEdit = editTask && !editTask._addSubtask && !editTask.parentId;
  const isSubtask = !!editTask?.parentId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useState(() => {
    if (open) {
      setName(editTask?.name ?? "");
      setDescription(editTask?.description ?? "");
      setProjectId(editTask?.projectId ?? "");
      setPriority(editTask?.priority ?? "MEDIUM");
      setAssigneeId(editTask?.assigneeId ?? "");
      setDueDate(editTask?.dueDate ? editTask.dueDate.substring(0, 10) : "");
      setSubtasks([]);
    }
  });

  // Re-populate when editTask changes
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setName(editTask?.name ?? "");
    setDescription(editTask?.description ?? "");
    setProjectId(editTask?.projectId ?? "");
    setPriority(editTask?.priority ?? "MEDIUM");
    setAssigneeId(editTask?.assigneeId ?? "");
    setDueDate(editTask?.dueDate ? editTask.dueDate.substring(0, 10) : "");
    setSubtasks([]);
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const addSubtask = () => setSubtasks((p) => [...p, { name: "", assigneeId: "" }]);
  const removeSubtask = (i: number) => setSubtasks((p) => p.filter((_, idx) => idx !== i));
  const updateSubtask = (i: number, field: keyof SubtaskInput, val: string) =>
    setSubtasks((p) => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const handleSave = async () => {
    if (!name.trim() || (!isSubtask && !projectId)) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        projectId: isSubtask ? editTask.projectId : projectId,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        ...(isSubtask && { parentId: editTask.parentId }),
      };

      if (isEdit) {
        await apiFetch(`/api/v1/tasks/${editTask.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        const parentTask = await apiFetch("/api/v1/tasks", { method: "POST", body: JSON.stringify(payload) });
        // Create subtasks
        for (const st of subtasks.filter((s) => s.name.trim())) {
          await apiFetch("/api/v1/tasks", {
            method: "POST",
            body: JSON.stringify({
              name: st.name.trim(),
              projectId: isSubtask ? editTask.projectId : projectId,
              priority: "MEDIUM",
              assigneeId: st.assigneeId || assigneeId || null,
              parentId: (parentTask as any)?.id,
            }),
          });
        }
      }
      toast({ title: isEdit ? "Tarefa atualizada" : "Tarefa criada" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = [
    { value: "", label: "Selecione a obra" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const userOptions = [
    { value: "", label: "Sem responsável" },
    ...users.map((u: any) => ({ value: u.id, label: u.name })),
  ];
  const priorityOptions = [
    { value: "LOW", label: "Baixa" },
    { value: "MEDIUM", label: "Média" },
    { value: "HIGH", label: "Alta" },
    { value: "URGENT", label: "Urgente" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Tarefa" : isSubtask ? "Nova Subtarefa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            label="Nome da tarefa *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Instalar elétrica sala"
          />

          {!isSubtask && (
            <Select
              label="Obra *"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Prioridade"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={priorityOptions}
            />
            <Select
              label="Responsável"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              options={userOptions}
            />
          </div>

          <Input
            label="Prazo"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalhes opcionais..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none"
            />
          </div>

          {/* Subtasks (only for new parent tasks) */}
          {!isEdit && !isSubtask && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Subtarefas</label>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </button>
              </div>
              {subtasks.length === 0 && (
                <p className="text-xs text-gray-400">Nenhuma subtarefa. Clique em "Adicionar" para criar etapas.</p>
              )}
              <div className="space-y-2">
                {subtasks.map((st, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => updateSubtask(i, "name", e.target.value)}
                        placeholder="Nome da subtarefa"
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                      />
                      <select
                        value={st.assigneeId}
                        onChange={(e) => updateSubtask(i, "assigneeId", e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                      >
                        {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <button onClick={() => removeSubtask(i)} className="text-gray-400 hover:text-red-500 mt-1.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving} disabled={!name.trim() || (!isSubtask && !projectId)}>
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
