import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { expenses: true, revenues: true } },
          expenses: { select: { amount: true } },
          revenues: { select: { amount: true } },
        },
      },
    },
  });

  if (!client) return apiError("Cliente não encontrado", 404);

  // Enrich projects with financial summary
  const enrichedClient = {
    ...client,
    projects: client.projects.map((p) => ({
      ...p,
      totalExpenses: p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      totalRevenues: p.revenues.reduce((sum, r) => sum + Number(r.amount), 0),
    })),
  };

  return apiSuccess(enrichedClient);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    // Check document uniqueness (excluding self)
    if (parsed.data.document) {
      const exists = await prisma.client.findFirst({
        where: {
          document: parsed.data.document,
          NOT: { id: params.id },
        },
      });
      if (exists) {
        return apiError("CPF/CNPJ já cadastrado para outro cliente");
      }
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        document: parsed.data.document || null,
        email: parsed.data.email || null,
      },
    });

    return apiSuccess(client);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Cliente não encontrado", 404);
    return apiError("Erro ao atualizar cliente", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const [projectCount, budgetCount] = await Promise.all([
    prisma.project.count({ where: { clientId: params.id } }),
    prisma.budget.count({ where: { clientId: params.id } }),
  ]);

  if (projectCount > 0) {
    return apiError(`Não é possível excluir: cliente possui ${projectCount} obra(s) vinculada(s). Inative-o.`);
  }
  if (budgetCount > 0) {
    return apiError(`Não é possível excluir: cliente possui ${budgetCount} orçamento(s) vinculado(s). Inative-o.`);
  }

  try {
    // Revenues têm clientId nullable — desvincula antes de excluir
    await prisma.revenue.updateMany({
      where: { clientId: params.id },
      data: { clientId: null },
    });

    await prisma.client.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Cliente excluído com sucesso" });
  } catch (error: unknown) {
    console.error(error);
    return apiError("Erro ao excluir cliente", 500);
  }
}
