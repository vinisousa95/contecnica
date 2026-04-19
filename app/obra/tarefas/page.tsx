"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, AlertTriangle, Clock, LogOut, RefreshCw } from "lucide-react";

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "URGENTE",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function today() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ObraTarefasPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/obra/v1/tasks");
      if (res.status === 401) { router.replace("/obra/login"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar tarefas");
      setTasks(json.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // get name from cookie/session — just fetch user info
    fetch("/api/v1/auth/me").then(r => r.json()).then(j => { if (j.data?.name) setUserName(j.data.name); }).catch(() => {});
  }, []);

  const updateStatus = async (taskId: string, status: string) => {
    setUpdating(taskId);
    try {
      const res = await fetch(`/api/obra/v1/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) return { ...t, status };
          return {
            ...t,
            children: t.children?.map((c: any) => c.id === taskId ? { ...c, status } : c),
          };
        })
      );
    } catch {
    } finally {
      setUpdating(null);
    }
  };

  const toggleChild = (child: any) => {
    const next = child.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    updateStatus(child.id, next);
  };

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/obra/login");
  };

  // Group tasks by project
  const byProject: Record<string, { projectName: string; tasks: any[] }> = {};
  for (const t of tasks) {
    if (!byProject[t.projectId]) byProject[t.projectId] = { projectName: t.project?.name ?? "Obra", tasks: [] };
    byProject[t.projectId].tasks.push(t);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Execução de Tarefas</p>
            <p className="text-lg font-bold mt-0.5 capitalize">{today()}</p>
            {userName && <p className="text-sm text-orange-400 font-medium mt-0.5">{userName}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTasks}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-5 w-5 text-gray-300" />
            </button>
            <button
              onClick={logout}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={fetchTasks} className="mt-3 text-sm text-red-500 underline">Tentar novamente</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="mt-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-700">Sem tarefas pendentes!</p>
            <p className="text-gray-400 mt-1">Nenhuma tarefa atribuída para você no momento.</p>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {Object.values(byProject).map(({ projectName, tasks: ptasks }) => (
              <div key={projectName}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{projectName}</h2>
                </div>
                <div className="space-y-3">
                  {ptasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleChild={toggleChild}
                      onUpdateStatus={updateStatus}
                      updating={updating}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({
  task,
  onToggleChild,
  onUpdateStatus,
  updating,
}: {
  task: any;
  onToggleChild: (child: any) => void;
  onUpdateStatus: (id: string, status: string) => void;
  updating: string | null;
}) {
  const isUrgent = task.priority === "URGENT";
  const isHigh = task.priority === "HIGH";
  const totalChildren = task.children?.length ?? 0;
  const doneChildren = task.children?.filter((c: any) => c.status === "COMPLETED").length ?? 0;

  const borderColor = isUrgent ? "border-red-400" : isHigh ? "border-amber-400" : "border-gray-200";
  const headerBg = isUrgent ? "bg-red-50" : isHigh ? "bg-amber-50" : "bg-white";

  const cycleStatus = () => {
    const next = task.status === "PENDING" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
    onUpdateStatus(task.id, next);
  };

  return (
    <div className={`rounded-2xl border-2 ${borderColor} bg-white shadow-sm overflow-hidden`}>
      {/* Parent task header */}
      <div className={`${headerBg} px-5 py-4`}>
        <div className="flex items-start gap-3">
          <button
            onClick={cycleStatus}
            disabled={updating === task.id}
            className="mt-0.5 flex-shrink-0 transition-transform active:scale-95"
          >
            {task.status === "COMPLETED" ? (
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            ) : task.status === "IN_PROGRESS" ? (
              <Clock className="h-7 w-7 text-blue-500" />
            ) : (
              <Circle className="h-7 w-7 text-gray-300" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-base font-bold ${task.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-900"}`}>
                {task.name}
              </h3>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  <AlertTriangle className="h-3 w-3" />
                  URGENTE
                </span>
              )}
              {isHigh && !isUrgent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  Alta prioridade
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-gray-500 mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.dueDate && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Prazo: {formatDate(task.dueDate)}
                </span>
              )}
              {totalChildren > 0 && (
                <span className="text-xs text-gray-400">
                  {doneChildren}/{totalChildren} subtarefas concluídas
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {task.children && task.children.length > 0 && (
        <div className="divide-y divide-gray-100">
          {task.children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => onToggleChild(child)}
              disabled={updating === child.id}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              {child.status === "COMPLETED" ? (
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-6 w-6 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-base ${child.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
                {child.name}
              </span>
              {updating === child.id && (
                <div className="ml-auto w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
