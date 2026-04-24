"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatPhone, formatDocument, formatCurrency, formatDate,
  SPECIALTY_LABELS, SPECIALTY_COLORS, PROVIDER_TYPE_LABELS,
  WORK_PROVIDER_STATUS_LABELS, WORK_PROVIDER_STATUS_COLORS,
  EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingPage } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Pencil, Phone, Mail, MapPin, Banknote,
  HardHat, FileText, Wrench,
} from "lucide-react";

export default function PrestadorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["service-provider", id],
    queryFn: () => api.serviceProviders.get(id),
  });

  if (isLoading) return <LoadingPage />;

  const provider = data as any;
  if (!provider) return null;

  const links: any[] = provider.workLinks ?? [];
  const totalAgreed = links.reduce((s: number, l: any) => s + parseFloat(l.agreedAmount ?? "0"), 0);
  const totalPaid = links
    .filter((l: any) => l.expense?.status === "PAID")
    .reduce((s: number, l: any) => s + parseFloat(l.expense?.amount ?? "0"), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={provider.name}
        description={SPECIALTY_LABELS[provider.specialty]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/prestadores"><ArrowLeft className="h-4 w-4" />Voltar</Link>
            </Button>
            <Button asChild>
              <Link href={`/prestadores/${id}/editar`}><Pencil className="h-4 w-4" />Editar</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${SPECIALTY_COLORS[provider.specialty]}`}>
                  <Wrench className="h-3 w-3 mr-1" />{SPECIALTY_LABELS[provider.specialty]}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${provider.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {provider.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="text-xs text-gray-500">{PROVIDER_TYPE_LABELS[provider.type]}</div>

              {provider.documentNumber && (
                <div>
                  <p className="text-xs text-gray-400">{provider.type === "COMPANY" ? "CNPJ" : "CPF"}</p>
                  <p className="font-medium">{formatDocument(provider.documentNumber)}</p>
                </div>
              )}

              {provider.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`tel:${provider.phone}`} className="hover:text-blue-600">{formatPhone(provider.phone)}</a>
                </div>
              )}

              {provider.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${provider.email}`} className="hover:text-blue-600 truncate">{provider.email}</a>
                </div>
              )}

              {(provider.street || provider.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                  <p className="text-gray-600">
                    {[provider.street, provider.number, provider.neighborhood, provider.city, provider.state]
                      .filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {(provider.pixKey || provider.bankInfo) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Banknote className="h-4 w-4" />Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {provider.pixKey && (
                  <div>
                    <p className="text-xs text-gray-400">Chave Pix</p>
                    <p className="font-medium">{provider.pixKey}</p>
                  </div>
                )}
                {provider.bankInfo && (
                  <div>
                    <p className="text-xs text-gray-400">Dados Bancários</p>
                    <p className="text-gray-600 whitespace-pre-line">{provider.bankInfo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {provider.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 whitespace-pre-line">{provider.notes}</CardContent>
            </Card>
          )}

          {/* Financial summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total combinado</span>
                <span className="font-semibold">{formatCurrency(totalAgreed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total pago</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Obras atendidas</span>
                <span className="font-semibold">{new Set(links.map((l: any) => l.projectId)).size}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — History */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <HardHat className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Histórico de Obras ({links.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {links.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma obra vinculada ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">
                          <Link href={`/obras/${l.projectId}`} className="font-medium hover:text-blue-600">
                            {l.project?.name}
                          </Link>
                          <p className="text-xs text-gray-400">{PROJECT_STATUS_LABELS[l.project?.status]}</p>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[180px] truncate">{l.serviceDescription}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {l.agreedAmount ? formatCurrency(l.agreedAmount) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {l.startDate ? formatDate(l.startDate) : "—"}
                          {l.expectedEndDate && <> → {formatDate(l.expectedEndDate)}</>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${WORK_PROVIDER_STATUS_COLORS[l.status]}`}>
                            {WORK_PROVIDER_STATUS_LABELS[l.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          {l.expense ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_STATUS_COLORS[l.expense.status]}`}>
                              {EXPENSE_STATUS_LABELS[l.expense.status]}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
