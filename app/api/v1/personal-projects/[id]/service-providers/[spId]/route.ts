import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: NextRequest, { params }: { params: { id: string; spId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string; spId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  await prisma.personalProjectProvider.delete({ where: { id: params.spId } });
  return apiSuccess({ message: "Removido" });
}
