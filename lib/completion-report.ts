import { prisma } from "@/lib/prisma";

/**
 * Dados do Relatório de Conclusão de Obra — VERSÃO CLIENTE.
 *
 * Só entra o que é do cliente: contrato/pagamentos, serviços extras aprovados,
 * progresso, etapas, fotos (antes/depois) e linha do tempo. NÃO expõe custos
 * internos: despesas, materiais, valores de prestadores ou margem.
 *
 * Usado tanto pela rota do admin quanto pela do portal, para os dois lados
 * mostrarem exatamente o mesmo documento.
 */

export interface CompletionParcela {
  description: string;
  dueDate: Date;
  amount: number;
  received: boolean;
}

export interface CompletionPhoto {
  imageUrl: string;
  description: string | null;
}

export interface CompletionReportData {
  project: {
    id: string;
    name: string;
    status: string;
    progress: number;
    startDate: Date | null;
    endDate: Date | null;
    address: string;
    description: string | null;
    notes: string | null;
  };
  client: { name: string; document: string | null };
  company: {
    name: string;
    cnpj: string | null;
    city: string | null;
    phone: string | null;
    address: string;
    logoUrl: string | null;
    signatureUrl: string | null;
  };
  payments: {
    contractTotal: number;
    received: number;
    pending: number;
    parcelas: CompletionParcela[];
  };
  extras: { name: string; amount: number }[];
  steps: { name: string; done: boolean }[];
  photos: { before: CompletionPhoto[]; after: CompletionPhoto[]; general: CompletionPhoto[] };
  timeline: { date: Date; title: string; description: string | null }[];
}

function joinAddress(parts: (string | null | undefined)[], tail?: string | null): string {
  const base = parts.filter(Boolean).join(", ");
  return [base, tail].filter(Boolean).join(" — ");
}

export async function getCompletionReportData(
  projectId: string
): Promise<CompletionReportData | null> {
  const [project, company] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { name: true, document: true } },
        revenues: { orderBy: { dueDate: "asc" } },
        extraServices: { where: { status: "ACCEPTED" }, orderBy: { createdAt: "asc" } },
        tasks: { where: { showInPortal: true }, orderBy: { order: "asc" } },
        updates: { orderBy: { createdAt: "asc" } },
        photos: { where: { visible: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!project) return null;

  const contractTotal = project.revenues.reduce((s, r) => s + Number(r.amount), 0);
  const received = project.revenues
    .filter((r) => r.status === "RECEIVED")
    .reduce((s, r) => s + Number(r.amount), 0);

  const cityUf = project.city
    ? `${project.city}${project.state ? "/" + project.state : ""}`
    : project.state ?? "";

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.actualEndDate ?? project.expectedEndDate,
      address: joinAddress(
        [project.street, project.number, project.neighborhood],
        cityUf || null
      ),
      description: project.description,
      notes: project.notes,
    },
    client: { name: project.client.name, document: project.client.document },
    company: {
      name: company?.name ?? "",
      cnpj: company?.cnpj ?? null,
      city: company?.city ?? null,
      phone: company?.phone ?? null,
      address: joinAddress(
        [company?.street, company?.number, company?.neighborhood],
        company?.city ? `${company.city}${company?.state ? "/" + company.state : ""}` : null
      ),
      logoUrl: company?.logoUrl ?? null,
      signatureUrl: company?.signatureUrl ?? null,
    },
    payments: {
      contractTotal,
      received,
      pending: Math.max(0, Math.round((contractTotal - received) * 100) / 100),
      parcelas: project.revenues.map((r) => ({
        description: r.description,
        dueDate: r.dueDate,
        amount: Number(r.amount),
        received: r.status === "RECEIVED",
      })),
    },
    extras: project.extraServices.map((e) => ({ name: e.name, amount: Number(e.amount) })),
    steps: project.tasks.map((t) => ({ name: t.name, done: t.isCompleted })),
    photos: {
      before: project.photos
        .filter((p) => p.phase === "BEFORE")
        .map((p) => ({ imageUrl: p.imageUrl, description: p.description })),
      after: project.photos
        .filter((p) => p.phase === "AFTER")
        .map((p) => ({ imageUrl: p.imageUrl, description: p.description })),
      general: project.photos
        .filter((p) => p.phase == null)
        .map((p) => ({ imageUrl: p.imageUrl, description: p.description })),
    },
    timeline: project.updates.map((u) => ({
      date: u.createdAt,
      title: u.title,
      description: u.description,
    })),
  };
}
