"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import { createUserSchema, type CreateUserInput } from "@/lib/validations";
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
import { formatDate } from "@/lib/utils";
import { Plus, UserX, UserCheck, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list() as Promise<any>,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserInput) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário criado com sucesso!", variant: "success" });
      setShowCreate(false);
      reset();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "error" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário desativado", variant: "success" });
      setDeactivateId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
      setDeactivateId(null);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "ADMIN" },
  });

  const users = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPage />
          ) : users.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EA580C]/10 flex items-center justify-center">
                          <span className="text-[#EA580C] text-xs font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">{formatDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {u.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeactivateId(u.id)}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Desativar
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 px-3">Inativo</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))} className="space-y-4">
            <Input
              label="Nome"
              required
              placeholder="Nome completo"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="E-mail"
              type="email"
              required
              placeholder="email@exemplo.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Senha"
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register("password")}
            />
            <Select
              label="Perfil"
              options={[
                { value: "ADMIN", label: "Administrador" },
                { value: "MANAGER", label: "Gerente" },
                { value: "EMPLOYEE", label: "Funcionário" },
              ]}
              error={errors.role?.message}
              {...register("role")}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        title="Desativar usuário"
        description="O usuário perderá acesso ao sistema. Esta ação pode ser revertida manualmente."
        confirmLabel="Desativar"
        variant="warning"
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateId && deactivateMutation.mutate(deactivateId)}
      />
    </div>
  );
}
