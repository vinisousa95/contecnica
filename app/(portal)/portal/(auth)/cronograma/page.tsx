"use client";

import { useQuery } from "@tanstack/react-query";
import { usePortal } from "@/components/portal/portal-provider";
import { LoadingPage } from "@/components/ui/loading";
import { CalendarDays, CheckCircle2, Circle } from "lucide-react";

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

export default function PortalCronogramaPage() {
  const { projectId } = usePortal();

  const { data, isLoading } = useQuery({
    queryKey: ["portal-cronograma", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/v1/projects/${projectId}/cronograma`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      return json.data as { project: any; tasks: any[] };
    },
    enabled: !!projectId,
  });

  if (!projectId || isLoading) return <LoadingPage message="Carregando cronograma..." />;
  if (!data) return null;

  const { project, tasks } = data;

  const projectStart = project.startDate ? new Date(project.startDate) : new Date();
  const projectEnd = project.expectedEndDate ? new Date(project.expectedEndDate) : addDays(projectStart, 60);
  const totalDays = Math.max(diffDays(projectStart, projectEnd), 1);

  const completed = tasks.filter(t => t.isCompleted).length;
  const withDates = tasks.filter(t => t.startDate && t.endDate).length;

  // Week headers
  const weeks: { label: string; pct: number }[] = [];
  let cur = new Date(projectStart);
  while (cur <= projectEnd) {
    const days = Math.min(7, diffDays(cur, projectEnd) + 1);
    weeks.push({ label: fmt(new Date(cur)), pct: (days / totalDays) * 100 });
    cur = addDays(cur, 7);
  }

  const getBarStyle = (task: any) => {
    if (!task.startDate || !task.endDate) return null;
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const left = Math.max(0, (diffDays(projectStart, start) / totalDays) * 100);
    const width = Math.max(0.5, (diffDays(start, end) / totalDays) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cronograma</h1>
        <p className="text-sm text-gray-500 mt-0.5">Previsão de execução dos serviços da sua obra</p>
      </div>

      {/* Timeline info */}
      <div className="bg-[#1F2937] rounded-xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Período da Obra</p>
          <p className="font-semibold">
            {project.startDate ? fmtFull(new Date(project.startDate)) : "—"}
            {" → "}
            {project.expectedEndDate ? fmtFull(new Date(project.expectedEndDate)) : "—"}
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#EA580C]">{completed}</p>
            <p className="text-xs text-gray-400">Concluídos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{tasks.length - completed}</p>
            <p className="text-xs text-gray-400">Pendentes</p>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">Cronograma em elaboração</p>
          <p className="text-xs text-gray-400 mt-1">Em breve os itens aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(totalDays * 24, 500) }}>
              {/* Week header */}
              <div className="flex border-b border-gray-100 bg-gray-50">
                <div className="w-48 flex-shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-100">
                  SERVIÇO
                </div>
                <div className="flex-1 flex">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="border-r border-gray-100 text-xs text-gray-400 px-2 py-2"
                      style={{ width: `${w.pct}%` }}
                    >
                      {w.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task rows */}
              {tasks.map((task, idx) => {
                const barStyle = getBarStyle(task);
                return (
                  <div
                    key={task.id}
                    className={`flex border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-100 flex items-center gap-2">
                      {task.isCompleted
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      }
                      <span className={`text-xs truncate ${task.isCompleted ? "line-through text-gray-400" : "text-gray-700 font-medium"}`}>
                        {task.name}
                      </span>
                    </div>
                    <div className="flex-1 relative py-2 px-1" style={{ minHeight: 44 }}>
                      {barStyle && (
                        <div
                          className={`absolute top-2 h-6 rounded flex items-center px-2 ${task.isCompleted ? "bg-green-400" : "bg-[#EA580C]"}`}
                          style={barStyle}
                          title={`${fmtFull(new Date(task.startDate))} → ${fmtFull(new Date(task.endDate))}`}
                        >
                          <span className="text-white text-xs truncate">{task.name}</span>
                        </div>
                      )}
                      {!barStyle && (
                        <div className="absolute top-3 left-2 text-xs text-gray-300 italic">a definir</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#EA580C]" />
              <span className="text-xs text-gray-500">Em andamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-400" />
              <span className="text-xs text-gray-500">Concluído</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
