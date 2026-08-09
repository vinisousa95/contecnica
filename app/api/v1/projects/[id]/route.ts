import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { projectFinancials } from "@/lib/project-financials";
import { projectSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, phone: true, email: true } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true, color: true } } },
      },
      revenues: {
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true, color: true } } },
      },
    },
  });

  if (!project) return apiError("Obra não encontrada", 404);

  const fin = projectFinancials(project.expenses, project.revenues);

  return apiSuccess({
    ...project,
    expenses: project.expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    revenues: project.revenues.map((r) => ({ ...r, amount: Number(r.amount) })),
    financialSummary: {
      budget: project.budget ? Number(project.budget) : null,
      ...fin,
      budgetUsed: project.budget ? (fin.totalExpenses / Number(project.budget)) * 100 : null,
      budgetVariance: project.budget ? Number(project.budget) - fin.totalExpenses : null,
    },
  });
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = projectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { startDate, expectedEndDate, budget, progress, coverPhoto, ...rest } = parsed.data;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...rest,
        progress: progress ?? 0,
        coverPhoto: coverPhoto ?? null,
        startDate: startDate ? new Date(startDate) : null,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
        actualEndDate:
          rest.status === "COMPLETED" ? new Date() : undefined,
        budget: budget ? parseFloat(budget) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(project);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Obra não encontrada", 404);
    return apiError("Erro ao atualizar obra", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.$transaction([
      prisma.expense.deleteMany({ where: { projectId: params.id } }),
      prisma.revenue.deleteMany({ where: { projectId: params.id } }),
      prisma.workAssignment.deleteMany({ where: { projectId: params.id } }),
      prisma.appSubmission.deleteMany({ where: { projectId: params.id } }),
      prisma.project.delete({ where: { id: params.id } }),
    ]);
    return apiSuccess({ message: "Obra excluída com sucesso" });
  } catch {
    return apiError("Erro ao excluir obra", 500);
  }
}
