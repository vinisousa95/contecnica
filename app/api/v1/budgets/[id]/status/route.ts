import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { budgetStatusSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["SENT", "DRAFT", "CANCELLED"],
  SENT: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["SENT"],
  REJECTED: ["DRAFT"],
  CANCELLED: ["DRAFT"],
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const existing = await prisma.budget.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { reformItem: true, reformPackage: true } as any },
      extraItems: true,
    },
  });
  if (!existing) return apiError("Orçamento não encontrado", 404);

  const parsed = await validateBody(request, budgetStatusSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { status } = body;
  if (!status) return apiError("Status é obrigatório");

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(status)) {
    return apiError(`Transição de ${existing.status} para ${status} não é permitida`);
  }

  const budget = await prisma.budget.update({
    where: { id: params.id },
    data: { status },
    select: { id: true, status: true, code: true },
  });

  // Auto-create project when budget is approved
  if (status === "APPROVED") {
    const alreadyLinked = await prisma.project.findFirst({ where: { linkedBudgetId: params.id } });

    if (!alreadyLinked) {
      const allItems = [
        ...existing.items.map((it: any, i) => ({ name: it.reformPackage?.name ?? it.reformItem?.name ?? "Item", description: it.reformItem?.description ?? null, order: i })),
        ...existing.extraItems.map((it, i) => ({ name: it.name, description: it.description ?? null, order: existing.items.length + i })),
      ];

      const project = await prisma.project.create({
        data: {
          name: existing.title,
          clientId: existing.clientId,
          status: "PLANNING",
          budget: existing.totalAmount,
          linkedBudgetId: existing.id,
          zipCode: existing.zipCode,
          street: existing.street,
          number: existing.number,
          complement: existing.complement,
          neighborhood: existing.neighborhood,
          city: existing.city,
          state: existing.state,
          tasks: {
            create: allItems.map((it) => ({
              name: it.name,
              description: it.description,
              order: it.order,
              showInPortal: true,
            })),
          },
        },
      });

      return apiSuccess({ ...budget, projectCreated: true, projectId: project.id });
    }
  }

  return apiSuccess(budget);
}
