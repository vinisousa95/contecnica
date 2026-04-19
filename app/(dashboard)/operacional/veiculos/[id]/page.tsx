"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { ArrowLeft, Pencil, Truck, MapPin } from "lucide-react";

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em Manutenção",
  INACTIVE: "Inativo",
};

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function VeiculoDetailPage({ params }: { params: { id: string } }) {
  const { data: vehicle, isLoading: isLoadingVehicle } = useQuery({
    queryKey: ["vehicle", params.id],
    queryFn: () => api.vehicles.get(params.id) as Promise<any>,
  });

  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["assignments", "vehicle", params.id],
    queryFn: () =>
      api.assignments.list({
        vehicleId: params.id,
        limit: "50",
      }),
    enabled: !!params.id,
  });

  const assignments = assignmentsData?.data ?? [];

  if (isLoadingVehicle) return <LoadingPage />;
  if (!vehicle) return null;

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={vehicle.name}
        description={[vehicle.model, vehicle.plate].filter(Boolean).join(" — ") || "Veículo"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/operacional/veiculos">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/operacional/veiculos/${params.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${VEHICLE_STATUS_COLORS[vehicle.status]}`}>
                  {VEHICLE_STATUS_LABELS[vehicle.status]}
                </span>
              </div>
              {vehicle.model && (
                <div>
                  <p className="text-xs text-gray-500">Modelo</p>
                  <p className="text-sm font-medium text-gray-800">{vehicle.model}</p>
                </div>
              )}
              {vehicle.plate && (
                <div>
                  <p className="text-xs text-gray-500">Placa</p>
                  <p className="text-sm font-medium text-gray-800 font-mono">{vehicle.plate}</p>
                </div>
              )}
              {vehicle.type && (
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="text-sm text-gray-700">{vehicle.type}</p>
                </div>
              )}
              {vehicle.color && (
                <div>
                  <p className="text-xs text-gray-500">Cor</p>
                  <p className="text-sm text-gray-700">{vehicle.color}</p>
                </div>
              )}
              {vehicle.year && (
                <div>
                  <p className="text-xs text-gray-500">Ano</p>
                  <p className="text-sm text-gray-700">{vehicle.year}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Cadastrado em</p>
                <p className="text-sm text-gray-700">{formatDate(vehicle.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {vehicle.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{vehicle.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assignment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Histórico de Uso ({assignments.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingAssignments ? (
                <LoadingPage />
              ) : assignments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum registro de uso para este veículo</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50/80">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(a.date)}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSIGNMENT_STATUS_COLORS[a.status]}`}>
                            {ASSIGNMENT_STATUS_LABELS[a.status]}
                          </span>
                        </div>
                        <Link
                          href={`/obras/${a.project?.id}`}
                          className="text-sm text-gray-600 hover:text-blue-600 mt-0.5 block"
                        >
                          {a.project?.name ?? "—"}
                        </Link>
                        {a.employee && (
                          <Link
                            href={`/operacional/funcionarios/${a.employee.id}`}
                            className="text-xs text-gray-400 mt-0.5 hover:text-blue-600"
                          >
                            {a.employee.name}
                            {a.employee.role ? ` — ${a.employee.role}` : ""}
                          </Link>
                        )}
                        {a.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{a.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        {a.departureTime && (
                          <p className="text-xs text-gray-500">
                            Saída: <span className="font-medium">{a.departureTime}</span>
                          </p>
                        )}
                        {a.returnTime && (
                          <p className="text-xs text-gray-500">
                            Retorno: <span className="font-medium">{a.returnTime}</span>
                          </p>
                        )}
                        <Button variant="ghost" size="sm" asChild className="mt-1 h-6 text-xs">
                          <Link href={`/operacional/${a.id}/editar`}>
                            Editar
                          </Link>
                        </Button>
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
