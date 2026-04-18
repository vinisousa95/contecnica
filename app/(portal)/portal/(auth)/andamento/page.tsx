"use client";

import { usePortal } from "@/components/portal/portal-provider";
import { LoadingPage } from "@/components/ui/loading";
import { Clock, CheckCircle2, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

function useTasks(projectId: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["portal-tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/v1/projects/${projectId}/tasks`);
      const json = await res.json();
      return json.data ?? [];
    },
  });
}

export default function PortalAndamentoPage() {
  const { projectId } = usePortal();
  const { data: tasks = [], isLoading } = useTasks(projectId ?? "");

  if (!projectId || isLoading) return <LoadingPage message="Carregando andamento..." />;

  const completed = tasks.filter((t: any) => t.isCompleted);
  const pending = tasks.filter((t: any) => !t.isCompleted);
  const totalDone = completed.length;
  const total = tasks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Andamento da Obra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Etapas e progresso da execução</p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#EA580C]">{Math.round((totalDone / total) * 100)}%</p>
            <p className="text-xs text-gray-400">{totalDone} de {total} concluídos</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progresso geral</span>
            <span>{totalDone}/{total} etapas</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#EA580C] rounded-full transition-all"
              style={{ width: `${Math.round((totalDone / total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma etapa cadastrada ainda</p>
          <p className="text-sm text-gray-400 mt-1">As etapas da obra serão exibidas aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div className="space-y-0">
              {tasks.map((task: any, i: number) => (
                <div key={task.id} className="relative flex gap-5 pb-7 last:pb-0">
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                      task.isCompleted ? "bg-[#EA580C]" : "bg-gray-100"
                    }`}>
                      {task.isCompleted
                        ? <CheckCircle2 className="h-4 w-4 text-white" />
                        : <Circle className="h-4 w-4 text-gray-300" />
                      }
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-semibold ${task.isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                          {task.name}
                        </p>
                        {task.description && (
                          <p className="text-sm text-gray-400 mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {task.startDate && (
                            <span className="text-xs text-gray-400">
                              Início: {formatDate(task.startDate)}
                            </span>
                          )}
                          {task.endDate && (
                            <span className={`text-xs font-medium ${task.isCompleted ? "text-[#EA580C]" : "text-gray-400"}`}>
                              {task.isCompleted ? "Concluído: " : "Previsão: "}{formatDate(task.endDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full mt-0.5 ${
                        task.isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {task.isCompleted ? "Concluído" : "Pendente"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
