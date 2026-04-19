"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ProjectInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovaObraPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get("clienteId") ?? undefined;

  const mutation = useMutation({
    mutationFn: (data: ProjectInput) => api.projects.create(data),
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Obra cadastrada com sucesso!", variant: "success" });
      router.push(`/obras/${project.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar obra", description: err.message, variant: "error" });
    },
  });

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Nova Obra"
        description="Cadastre uma nova obra ou reforma"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/obras">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ProjectForm
        defaultClientId={defaultClientId}
        onSubmit={(data) => mutation.mutateAsync(data).then(() => {})}
        isLoading={mutation.isPending}
        submitLabel="Cadastrar Obra"
      />
    </div>
  );
}
