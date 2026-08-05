"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingPage } from "@/components/ui/loading";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, X, Check, Building2, Phone, Mail } from "lucide-react";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";

const CATEGORY_OPTIONS = [
  { value: "", label: "Sem categoria" },
  { value: "Fornecedor de Material", label: "Fornecedor de Material" },
  { value: "Prestador de Serviços", label: "Prestador de Serviços" },
  { value: "Credor", label: "Credor" },
  { value: "Concessionária", label: "Concessionária" },
  { value: "Outros", label: "Outros" },
];

const EMPTY_FORM = { name: "", category: "", cpfCnpj: "", phone: "", email: "", notes: "" };

type SupplierForm = typeof EMPTY_FORM;

/**
 * Definido AQUI, no módulo — e não dentro de FornecedoresPage.
 *
 * Antes era `const FormFields = () => (...)` dentro do componente da página.
 * Isso cria uma função nova a cada renderização, então para o React era um tipo
 * de componente diferente a cada tecla: ele desmontava os inputs e montava
 * outros no lugar. O campo perdia o foco depois do primeiro caractere e não dava
 * para digitar um nome inteiro — só a primeira letra entrava.
 */
function SupplierFormFields({
  form,
  setField,
}: {
  form: SupplierForm;
  setField: (field: keyof SupplierForm, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input
        label="Nome *"
        placeholder="Nome do fornecedor ou credor"
        maxLength={200}
        value={form.name}
        onChange={(e) => setField("name", e.target.value)}
      />
      <Select
        label="Categoria"
        value={form.category}
        onChange={(e) => setField("category", e.target.value)}
        options={CATEGORY_OPTIONS}
      />
      {/* Máscaras: os placeholders já prometiam o formato, mas o valor era
          gravado como o usuário digitasse. */}
      <Input
        label="CPF / CNPJ"
        placeholder="000.000.000-00"
        inputMode="numeric"
        maxLength={18}
        value={form.cpfCnpj}
        onChange={(e) => setField("cpfCnpj", maskCpfCnpj(e.target.value))}
      />
      <Input
        label="Telefone"
        placeholder="(00) 00000-0000"
        inputMode="numeric"
        maxLength={15}
        value={form.phone}
        onChange={(e) => setField("phone", maskPhone(e.target.value))}
      />
      <div className="sm:col-span-2">
        <Input
          label="E-mail"
          type="email"
          placeholder="email@exemplo.com"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Textarea
          label="Observações"
          placeholder="Informações adicionais..."
          rows={2}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function FornecedoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: raw, isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => api.suppliers.list(search ? { search } : undefined),
  });
  const suppliers: any[] = Array.isArray(raw) ? raw : [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.suppliers.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor criado!", variant: "success" });
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.suppliers.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor atualizado!", variant: "success" });
      setEditingId(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.suppliers.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "error" });
      setDeleteId(null);
    },
  });

  function handleSaveNew(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    createMutation.mutate({
      name: form.name.trim(),
      category: form.category || null,
      cpfCnpj: form.cpfCnpj || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    });
  }

  function startEdit(s: any) {
    setForm({ name: s.name, category: s.category ?? "", cpfCnpj: s.cpfCnpj ?? "", phone: s.phone ?? "", email: s.email ?? "", notes: s.notes ?? "" });
    setEditingId(s.id);
    setShowNew(false);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ title: "Nome é obrigatório", variant: "error" });
    updateMutation.mutate({
      id: editingId!,
      data: {
        name: form.name.trim(),
        category: form.category || null,
        cpfCnpj: form.cpfCnpj || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      },
    });
  }

  const setField = (field: keyof SupplierForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fornecedores / Credores"
        description="Base de fornecedores para uso rápido nas despesas"
        actions={
          <Button onClick={() => { setShowNew(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }} disabled={showNew}>
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
        }
      />

      {showNew && (
        <Card className="border-[#EA580C]/30 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm text-gray-800">Novo Fornecedor</p>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowNew(false)}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-4">
              <SupplierFormFields form={form} setField={setField} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
                <Button type="submit" size="sm" loading={createMutation.isPending}>Criar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <Input
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {search ? "Nenhum fornecedor encontrado para esta busca." : "Nenhum fornecedor cadastrado ainda."}
            </p>
            {!search && (
              <Button size="sm" className="mt-3" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4" />Adicionar primeiro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {suppliers.map((s: any) => (
                <div key={s.id}>
                  {editingId === s.id ? (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-sm text-gray-800">Editando: {s.name}</p>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                      <form onSubmit={handleSaveEdit} className="space-y-4">
                        <SupplierFormFields form={form} setField={setField} />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                          <Button type="submit" size="sm" loading={updateMutation.isPending}>
                            <Check className="h-3.5 w-3.5" />Salvar
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">{s.name}</span>
                          {s.category && (
                            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{s.category}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                          {s.phone && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone className="h-3 w-3" />{s.phone}
                            </span>
                          )}
                          {s.email && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Mail className="h-3 w-3" />{s.email}
                            </span>
                          )}
                          {s.cpfCnpj && <span className="text-xs text-gray-400">{s.cpfCnpj}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(s)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(s.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir fornecedor"
        description="O fornecedor será removido da base. Despesas já cadastradas não serão afetadas."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
