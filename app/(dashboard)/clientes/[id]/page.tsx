"use client";;
import { use } from "react";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatPhone,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  CLIENT_STATUS_LABELS,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, HardHat } from "lucide-react";

export default function ClienteDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { data: client, isLoading } = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => api.clients.get(params.id) as Promise<any>,
  });

  if (isLoading) return <LoadingPage />;
  if (!client) return null;

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={client.name}
        description={`Cliente ${CLIENT_STATUS_LABELS[client.status]?.toLowerCase()}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/clientes">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clientes/${params.id}/portal`}>
                Portal
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/clientes/${params.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info cards */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.document && (
                <div>
                  <p className="text-xs text-gray-500">CPF/CNPJ</p>
                  <p className="text-sm font-medium text-gray-800">{formatDocument(client.document)}</p>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">{formatPhone(client.phone)}</p>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">{client.email}</p>
                </div>
              )}
              {(client.street || client.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                  <div>
                    {client.street && (
                      <p className="text-sm text-gray-700">
                        {client.street}, {client.number}
                        {client.complement && ` — ${client.complement}`}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-sm text-gray-500">
                        {client.neighborhood && `${client.neighborhood}, `}
                        {client.city}/{client.state}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-gray-400" />
                  Obras ({client.projects?.length ?? 0})
                </CardTitle>
                <Button size="sm" asChild>
                  <Link href={`/obras/nova?clienteId=${params.id}`}>Nova Obra</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(!client.projects || client.projects.length === 0) ? (
                <div className="px-5 py-10 text-center">
                  <HardHat className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma obra cadastrada para este cliente</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {client.projects.map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/80">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/obras/${project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 text-sm"
                        >
                          {project.name}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
                          >
                            {PROJECT_STATUS_LABELS[project.status]}
                          </span>
                          {project.startDate && (
                            <span className="text-xs text-gray-400">
                              Início: {formatDate(project.startDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-semibold text-gray-700">
                          {formatCurrency(project.receivedRevenues)}
                        </p>
                        <p className="text-xs text-gray-400">recebido</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
