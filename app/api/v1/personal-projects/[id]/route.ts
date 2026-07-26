import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/session";
import { canAccessPersonalProject } from "@/lib/personal-project-guard";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  address: z.string().max(300).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  budgetedAmount: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).strict();

function serialize(p: any) {
  const totalMaterials = (p.materials ?? []).reduce((s: number, m: any) => s + Number(m.total), 0);
  const totalExpenses = (p.projectExpenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalProviders = (p.projectProviders ?? []).reduce((s: number, pp: any) => s + Number(pp.agreedAmount ?? 0), 0);
  const totalCost = totalMaterials + totalExpenses + totalProviders;
  const budgeted = Number(p.budgetedAmount ?? 0);
  return {
    ...p,
    budgetedAmount: p.budgetedAmount ? Number(p.budgetedAmount) : null,
    materials: (p.materials ?? []).map((m: any) => ({ ...m, quantity: Number(m.quantity), unitPrice: Number(m.unitPrice), total: Number(m.total) })),
    projectExpenses: (p.projectExpenses ?? []).map((e: any) => ({ ...e, amount: Number(e.amount) })),
    projectProviders: (p.projectProviders ?? []).map((pp: any) => ({ ...pp, agreedAmount: pp.agreedAmount ? Number(pp.agreedAmount) : null, paidAmount: pp.paidAmount ? Number(pp.paidAmount) : null })),
    summary: { budgeted, totalMaterials, totalExpenses, totalProviders, totalCost, balance: budgeted - totalCost },
  };
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const project = await prisma.personalProject.findFirst({
    where: { id: params.id, createdById: session.userId },
    include: {
      materials: { orderBy: { createdAt: "desc" } },
      projectExpenses: { orderBy: { createdAt: "desc" } },
      projectProviders: { include: { serviceProvider: { select: { id: true, name: true, specialty: true, phone: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return apiError("Obra pessoal não encontrada", 404);
  return apiSuccess(serialize(project));
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.errors[0].message);
  const { name, address, description, startDate, expectedEndDate, status, budgetedAmount, notes } = parsed.data;
  const amount = budgetedAmount == null || budgetedAmount === "" ? null : Number(budgetedAmount);
  if (amount !== null && !Number.isFinite(amount)) return apiError("Valor orçado inválido");
  try {
    const project = await prisma.personalProject.update({
      where: { id: params.id },
      data: {
        name, address: address || null, description: description || null,
        startDate: startDate ? new Date(startDate + "T12:00:00.000Z") : null,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate + "T12:00:00.000Z") : null,
        status,
        budgetedAmount: amount,
        notes: notes || null,
      },
    });
    return apiSuccess({ ...project, budgetedAmount: project.budgetedAmount ? Number(project.budgetedAmount) : null });
  } catch (e: any) {
    if (e.code === "P2025") return apiError("Não encontrado", 404);
    throw e;
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  try {
    await prisma.personalProject.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir", 500);
  }
}
