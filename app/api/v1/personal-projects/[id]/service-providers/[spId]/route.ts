import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { canAccessPersonalProject } from "@/lib/personal-project-guard";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { projectProviderUpdateSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; spId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectProvider.findFirst({
    where: { id: params.spId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Prestador não encontrado", 404);
  const parsed = await validateBody(request, projectProviderUpdateSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { serviceDescription, agreedAmount, paidAmount, dueDate, paymentDate, status, notes } = body;
  const provider = await prisma.personalProjectProvider.update({
    where: { id: params.spId },
    data: {
      ...(serviceDescription && { serviceDescription: serviceDescription.trim() }),
      agreedAmount: agreedAmount !== undefined ? (agreedAmount ? parseFloat(agreedAmount) : null) : undefined,
      paidAmount: paidAmount !== undefined ? (paidAmount ? parseFloat(paidAmount) : null) : undefined,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate + "T12:00:00.000Z") : null) : undefined,
      paymentDate: paymentDate !== undefined ? (paymentDate ? new Date(paymentDate + "T12:00:00.000Z") : null) : undefined,
      ...(status && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: { serviceProvider: { select: { id: true, name: true, specialty: true } } },
  });
  return apiSuccess({ ...provider, agreedAmount: provider.agreedAmount ? Number(provider.agreedAmount) : null, paidAmount: provider.paidAmount ? Number(provider.paidAmount) : null });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; spId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectProvider.findFirst({
    where: { id: params.spId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Prestador não encontrado", 404);
  await prisma.personalProjectProvider.delete({ where: { id: params.spId } });
  return apiSuccess({ message: "Removido" });
}
