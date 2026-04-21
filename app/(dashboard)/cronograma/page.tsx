"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json.data;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmt(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtFull(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function GanttChart({ tasks, projectStart, projectEnd, onUpdateDates }: {
  tasks: any[];
  projectStart: Date;
  projectEnd: Date;
  onUpdateDates: (taskId: string, startDate: string | null, endDate: string | null) => void;
}) {
  const totalDays = Math.max(diffDays(projectStart, projectEnd), 1);
  const [editing, setEditing] = useState<{ id: string; start: string; end: string } | null>(null);

  const getBarStyle = (task: any) => {
    if (!task.startDate || !task.endDate) return null;
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const left = Math.max(0, (diffDays(projectStart, start) / totalDays) * 100);
    const width = Math.max(0.5, (diffDays(start, end) / totalDays) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  // Generate week headers
  const weeks: { label: string; days: number }[] = [];
  let cur = new Date(projectStart);
  while (cur <= projectEnd) {
    const weekStart = new Date(cur);
    const label = `${fmt(weekStart)}`;
    const days = Math.min(7, diffDays(cur, projectEnd) + 1);
    weeks.push({ label, days });
    cur = addDays(cur, 7);
  }

  const handleSave = (taskId: string) => {
    if (!editing) return;
    onUpdateDates(taskId, editing.start || null, editing.end || null);
    setEditing(null);
  };

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(totalDays * 28, 600) }}>
        {/* Week headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-64 flex-shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200">
            TAREFA
          </div>
          <div className="flex-1 flex">
            {weeks.map((w, i) => (
              <div
                key={i}
                className="border-r border-gray-100 text-xs text-gray-500 px-2 py-2 font-medium"
                style={{ width: `${(w.days / totalDays) * 100}%` }}
              >
                {w.label}
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {tasks.map((task, idx) => {
          const barStyle = getBarStyle(task);
          const isEditing = editing?.id === task.id;

          return (
            <div
              key={task.id}
              className={`flex border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
            >
              {/* Task name cell */}
              <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 flex items-center gap-2">
                {task.isCompleted
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                }
                <span className={`text-sm truncate ${task.isCompleted ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
                  {task.name}
                </span>
              </div>

              {/* Gantt bar cell */}
              <div className="flex-1 relative py-2 px-1" style={{ minHeight: 48 }}>
                {barStyle ? (
                  <div
                    className={`absolute top-2 h-7 rounded-md flex items-center px-2 cursor-pointer transition-opacity hover:opacity-80 ${
                      task.isCompleted
                        ? "bg-green-400"
                        : "bg-[#EA580C]"
                    }`}
                    style={barStyle}
                    onClick={() => setEditing({
                      id: task.id,
                      start: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
                      end: task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "",
                    })}
                    title={`${fmtFull(new Date(task.startDate))} → ${fmtFull(new Date(task.endDate))}`}
                  >
                    <span className="text-white text-xs font-medium truncate">{task.name}</span>
                  </div>
                ) : (
                  <button
                    className="absolute top-2 left-2 text-xs text-gray-400 hover:text-[#EA580C] border border-dashed border-gray-300 hover:border-[#EA580C] rounded px-2 py-1 transition-colors"
                    onClick={() => setEditing({
                      id: task.id,
                      start: "",
                      end: "",
                    })}
                  >
                    + definir datas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Date editor modal */}
      {editing && (() => {
        const task = tasks.find(t => t.id === editing.id);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-4 truncate">{task?.name}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={editing.start}
                    onChange={e => setEditing(prev => prev ? { ...prev, start: e.target.value } : null)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Data de Conclusão</label>
                  <input
                    type="date"
                    value={editing.end}
                    onChange={e => setEditing(prev => prev ? { ...prev, end: e.target.value } : null)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSave(editing.id)}
                  className="flex-1 px-3 py-2 text-sm bg-[#EA580C] text-white rounded-lg hover:bg-[#C2410C] font-medium"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function CronogramaPage() {
  const qc = useQueryClient();

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list-cronograma"],
    queryFn: () => apiFetch("/api/v1/projects?limit=100&status=IN_PROGRESS"),
  });

  const projects: any[] = projectsData?.data ?? projectsData ?? [];
  const [projectId, setProjectId] = useState<string>("");

  const selectedProject = projects.find((p: any) => p.id === projectId) ?? null;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["project-tasks-gantt", projectId],
    queryFn: () => apiFetch(`/api/v1/projects/${projectId}/tasks`),
    enabled: !!projectId,
  });

  const handleUpdateDates = useCallback(async (taskId: string, startDate: string | null, endDate: string | null) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ startDate, endDate }),
      });
      qc.invalidateQueries({ queryKey: ["project-tasks-gantt", projectId] });
      toast({ title: "Datas atualizadas", variant: "success" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar datas", description: e.message, variant: "error" });
    }
  }, [projectId, qc]);

  const projectStart = selectedProject?.startDate
    ? new Date(selectedProject.startDate)
    : new Date();
  const projectEnd = selectedProject?.expectedEndDate
    ? new Date(selectedProject.expectedEndDate)
    : addDays(projectStart, 60);

  // Count tasks with/without dates
  const withDates = (tasks as any[]).filter(t => t.startDate && t.endDate).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cronograma"
        description="Visualize e gerencie o cronograma de execução das obras"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 min-w-[220px]"
            >
              <option value="">Selecionar obra...</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {!projectId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">Selecione uma obra para visualizar o cronograma</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-gray-400">Carregando cronograma...</p>
          </CardContent>
        </Card>
      ) : (tasks as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum item encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Importe um orçamento aprovado na página da obra para gerar o cronograma.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              <span>
                {selectedProject?.startDate ? fmtFull(new Date(selectedProject.startDate)) : "—"}
                {" → "}
                {selectedProject?.expectedEndDate ? fmtFull(new Date(selectedProject.expectedEndDate)) : "—"}
              </span>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
              {withDates}/{(tasks as any[]).length} itens com datas
            </span>
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">
              {(tasks as any[]).filter((t: any) => t.isCompleted).length} concluídos
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <GanttChart
                tasks={tasks as any[]}
                projectStart={projectStart}
                projectEnd={projectEnd}
                onUpdateDates={handleUpdateDates}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
