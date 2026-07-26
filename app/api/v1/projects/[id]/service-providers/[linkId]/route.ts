import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  serviceDescription: z.string().min(2).optional(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  agreedAmount: z.string().optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { agreedAmount, startDate, expectedEndDate, ...rest } = parsed.data;

    const link = await prisma.workServiceProvider.update({
      where: { id: params.linkId, projectId: params.id },
      data: {
        ...rest,
        ...(agreedAmount !== undefined ? { agreedAmount: agreedAmount || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(expectedEndDate !== undefined
          ? { expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null }
          : {}),
      },
      include: {
        serviceProvider: true,
        expense: { select: { id: true, status: true, amount: true } },
      },
    });

    return apiSuccess(link);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") return apiError("Vínculo não encontrado", 404);
    return apiError("Erro ao atualizar vínculo", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    await prisma.workServiceProvider.delete({
      where: { id: params.linkId, projectId: params.id },
    });
    return apiSuccess({ message: "Vínculo removido" });
  } catch {
    return apiError("Erro ao remover vínculo", 500);
  }
}
