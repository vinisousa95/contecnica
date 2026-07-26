import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { subProjectSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

function serialize(p: any) {
  const totalMaterials = (p.materials ?? []).reduce((s: number, m: any) => s + Number(m.total), 0);
  const totalExpenses = (p.partnerExpenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalProviders = (p.partnerProviders ?? []).reduce((s: number, pp: any) => s + Number(pp.agreedAmount ?? 0), 0);
  const totalCost = totalMaterials + totalExpenses + totalProviders;
  const budgeted = Number(p.budgetedAmount ?? 0);
  return {
    ...p,
    budgetedAmount: p.budgetedAmount ? Number(p.budgetedAmount) : null,
    materials: (p.materials ?? []).map((m: any) => ({ ...m, quantity: Number(m.quantity), unitPrice: Number(m.unitPrice), total: Number(m.total) })),
    partnerExpenses: (p.partnerExpenses ?? []).map((e: any) => ({ ...e, amount: Number(e.amount) })),
    partnerProviders: (p.partnerProviders ?? []).map((pp: any) => ({ ...pp, agreedAmount: pp.agreedAmount ? Number(pp.agreedAmount) : null, paidAmount: pp.paidAmount ? Number(pp.paidAmount) : null })),
    summary: { budgeted, totalMaterials, totalExpenses, totalProviders, totalCost, balance: budgeted - totalCost },
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const project = await prisma.partnershipProject.findUnique({
    where: { id: params.id },
    include: {
      buyer: true,
      materials: { orderBy: { createdAt: "desc" } },
      partnerExpenses: { orderBy: { createdAt: "desc" } },
      partnerProviders: { include: { serviceProvider: { select: { id: true, name: true, specialty: true, phone: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return apiError("Obra parceria não encontrada", 404);
  return apiSuccess(serialize(project));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const parsed = await validateBody(request, subProjectSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { name, buyerId, address, description, startDate, expectedEndDate, status, budgetedAmount, notes } = body;
  if (!name?.trim()) return apiError("Nome é obrigatório");
  if (!buyerId) return apiError("Comprador/parceiro é obrigatório");
  try {
    const project = await prisma.partnershipProject.update({
      where: { id: params.id },
      data: {
        name: name.trim(), buyerId, address: address || null, description: description || null,
        startDate: startDate ? new Date(startDate + "T12:00:00.000Z") : null,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate + "T12:00:00.000Z") : null,
        status: status ?? "PLANNING",
        budgetedAmount: budgetedAmount ? parseFloat(budgetedAmount) : null,
        notes: notes || null,
      },
      include: { buyer: { select: { id: true, name: true } } },
    });
    return apiSuccess({ ...project, budgetedAmount: project.budgetedAmount ? Number(project.budgetedAmount) : null });
  } catch (e: any) {
    if (e.code === "P2025") return apiError("Não encontrado", 404);
    throw e;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  try {
    await prisma.partnershipProject.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir", 500);
  }
}
