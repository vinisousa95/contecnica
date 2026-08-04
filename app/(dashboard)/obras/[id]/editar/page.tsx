"use client";;
import { use } from "react";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ProjectInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { LoadingPage } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { pickSchemaFields } from "@/lib/form-utils";
import { projectSchema } from "@/lib/validations";

export default function EditarObraPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => api.projects.get(params.id) as Promise<any>,
  });

  const mutation = useMutation({
    mutationFn: (data: ProjectInput) => api.projects.update(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", params.id] });
      toast({ title: "Obra atualizada com sucesso!", variant: "success" });
      router.push(`/obras/${params.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "error" });
    },
  });

  if (isLoading) return <LoadingPage />;
  if (!project) return null;

  // pickSchemaFields em vez de `...project`: a resposta da API traz id,
  // createdAt, client, expenses, financialSummary… e o schema é estrito, então
  // enviar tudo isso fazia a gravação ser recusada.
  const defaultValues: Partial<ProjectInput> = {
    ...pickSchemaFields(projectSchema, project),
    clientId: project.client?.id ?? project.clientId,
    startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : undefined,
    expectedEndDate: project.expectedEndDate
      ? format(new Date(project.expectedEndDate), "yyyy-MM-dd")
      : undefined,
    budget: project.budget ? String(project.budget) : undefined,
    progress: project.progress ?? 0,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Editar Obra"
        description={project.name}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/obras/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ProjectForm
        defaultValues={defaultValues}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
