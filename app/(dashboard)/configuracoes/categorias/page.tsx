"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Despesa",
  INCOME: "Receita",
  BOTH: "Ambos",
};

const TYPE_COLORS: Record<string, string> = {
  EXPENSE: "bg-red-50 text-red-700",
  INCOME: "bg-green-50 text-green-700",
  BOTH: "bg-blue-50 text-blue-700",
};

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", ""],
    queryFn: () => api.categories.list({}) as Promise<any>,
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryInput) => api.categories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria criada!", variant: "success" });
      setShowCreate(false);
      reset();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar", description: err.message, variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria desativada", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: "EXPENSE" },
  });

  const categories = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categorias"
        description="Gerencie as categorias financeiras"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : categories.length === 0 ? (
            <div className="py-10 text-center">
              <Tag className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cat.color && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <span className="font-medium text-sm">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[cat.type]}`}>
                        {TYPE_LABELS[cat.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {cat._count?.expenses ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {cat._count?.revenues ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))} className="space-y-4">
            <Input
              label="Nome"
              required
              placeholder="Ex: Material de Construção"
              error={errors.name?.message}
              {...register("name")}
            />
            <Select
              label="Tipo"
              required
              options={[
                { value: "EXPENSE", label: "Despesa" },
                { value: "INCOME", label: "Receita" },
                { value: "BOTH", label: "Ambos" },
              ]}
              error={errors.type?.message}
              {...register("type")}
            />
            <Input
              label="Cor (hex)"
              type="color"
              error={errors.color?.message}
              {...register("color")}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar Categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Desativar categoria"
        description="A categoria será desativada e não aparecerá em novos lançamentos."
        confirmLabel="Desativar"
        variant="warning"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
