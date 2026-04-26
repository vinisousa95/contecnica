"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";

const DEFAULT_TEMPLATE = `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE EMPREITADA

Pelo presente instrumento particular, de um lado:

CONTRATANTE: {{cliente_nome}}, portador do CPF/CNPJ nº {{cliente_cnpj}}, residente e domiciliado em {{cliente_endereco}};

CONTRATADA: {{empresa_nome}}, inscrita no CNPJ sob nº {{empresa_cnpj}}, com sede em {{empresa_endereco}};

Têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª – DO OBJETO
A CONTRATADA se compromete a executar os serviços de reforma/construção no imóvel situado em {{obra_endereco}}, conforme descrito abaixo:

{{itens_servico}}

CLÁUSULA 2ª – DO PRAZO
Os serviços terão início em {{data_inicio}} e prazo de execução de {{prazo_dias}} dias corridos.

CLÁUSULA 3ª – DO VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de {{valor_total}} ({{valor_total_extenso}}), a ser pago conforme abaixo:

{{parcelas}}

CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA
A CONTRATADA se obriga a:
a) Executar os serviços com boa técnica e materiais de qualidade;
b) Manter o local de trabalho em ordem e segurança;
c) Respeitar as normas técnicas vigentes.

CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE se obriga a:
a) Efetuar os pagamentos nas datas acordadas;
b) Fornecer acesso ao imóvel nos horários combinados;
c) Não interferir na execução dos serviços.

CLÁUSULA 6ª – DAS ALTERAÇÕES
Quaisquer alterações no escopo dos serviços deverão ser acordadas por escrito entre as partes.

CLÁUSULA 7ª – DO FORO
As partes elegem o foro da cidade de {{cidade}} para dirimir quaisquer dúvidas oriundas deste contrato.

Por estarem justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor.

{{cidade}}, {{data_assinatura}}.


_______________________________________
CONTRATANTE
{{cliente_nome}}
CPF/CNPJ: {{cliente_cnpj}}


_______________________________________
CONTRATADA
{{empresa_nome}}
CNPJ: {{empresa_cnpj}}


_______________________________________
TESTEMUNHA 1
{{responsavel_nome}}
CPF: {{responsavel_cpf}}`;

export default function ContratosModelosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => api.contractTemplates.list() as Promise<any[]>,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.contractTemplates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast({ title: "Modelo criado!", variant: "success" });
      setShowForm(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.contractTemplates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast({ title: "Modelo atualizado!", variant: "success" });
      setEditTemplate(null);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contractTemplates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast({ title: "Modelo excluído", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  function resetForm() {
    setName("");
    setBody("");
  }

  function openCreate() {
    resetForm();
    setBody(DEFAULT_TEMPLATE);
    setShowForm(true);
  }

  function openEdit(t: any) {
    setName(t.name);
    setBody(t.body);
    setEditTemplate(t);
  }

  function handleSubmit() {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "error" });
    if (!body.trim()) return toast({ title: "Conteúdo obrigatório", variant: "error" });

    if (editTemplate) {
      updateMutation.mutateAsync({ id: editTemplate.id, data: { name, body } }).catch(() => {});
    } else {
      createMutation.mutateAsync({ name, body }).catch(() => {});
    }
  }

  const isOpen = showForm || !!editTemplate;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Modelos de Contrato"
        description="Crie e gerencie os modelos de contrato de serviço"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Carregando...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum modelo cadastrado</p>
            <p className="text-xs text-gray-300 mt-1">Crie um modelo para usar na geração de contratos</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Criar Primeiro Modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="py-4 px-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Criado em {formatDate(t.createdAt)} · {t.body.length} caracteres
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => setDeleteId(t.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) { setShowForm(false); setEditTemplate(null); resetForm(); }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Editar Modelo" : "Novo Modelo de Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Nome do modelo"
              required
              placeholder="ex: Contrato de Empreitada Padrão"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Conteúdo do Contrato
                <span className="ml-2 text-gray-400 font-normal">
                  Use variáveis como <code className="bg-gray-100 px-1 rounded text-xs">{"{{cliente_nome}}"}</code>, <code className="bg-gray-100 px-1 rounded text-xs">{"{{obra_endereco}}"}</code>, <code className="bg-gray-100 px-1 rounded text-xs">{"{{itens_servico}}"}</code>
                </span>
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-y"
                rows={20}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Digite o texto do contrato com variáveis..."
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-medium mb-1">Variáveis disponíveis:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span><code>{"{{empresa_nome}}"}</code> — Nome da empresa</span>
                <span><code>{"{{empresa_cnpj}}"}</code> — CNPJ da empresa</span>
                <span><code>{"{{empresa_endereco}}"}</code> — Endereço da empresa</span>
                <span><code>{"{{cliente_nome}}"}</code> — Nome do cliente</span>
                <span><code>{"{{cliente_cnpj}}"}</code> — CPF/CNPJ do cliente</span>
                <span><code>{"{{cliente_endereco}}"}</code> — Endereço do cliente</span>
                <span><code>{"{{obra_endereco}}"}</code> — Endereço da obra</span>
                <span><code>{"{{obra_descricao}}"}</code> — Descrição da obra</span>
                <span><code>{"{{itens_servico}}"}</code> — Lista de serviços</span>
                <span><code>{"{{parcelas}}"}</code> — Condições de pagamento</span>
                <span><code>{"{{valor_total}}"}</code> — Valor total (formatado)</span>
                <span><code>{"{{valor_total_extenso}}"}</code> — Valor por extenso</span>
                <span><code>{"{{data_inicio}}"}</code> — Data de início</span>
                <span><code>{"{{prazo_dias}}"}</code> — Prazo em dias</span>
                <span><code>{"{{cidade}}"}</code> — Cidade de assinatura</span>
                <span><code>{"{{data_assinatura}}"}</code> — Data da assinatura</span>
                <span><code>{"{{responsavel_nome}}"}</code> — Nome da testemunha</span>
                <span><code>{"{{responsavel_cpf}}"}</code> — CPF da testemunha</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditTemplate(null); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isPending}>
              {editTemplate ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir modelo"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
