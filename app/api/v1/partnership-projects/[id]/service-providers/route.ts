import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const providers = await prisma.partnershipProvider.findMany({
    where: { projectId: params.id },
    include: { serviceProvider: { select: { id: true, name: true, specialty: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess(providers.map(p => ({ ...p, agreedAmount: p.agreedAmount ? Number(p.agreedAmount) : null, paidAmount: p.paidAmount ? Number(p.paidAmount) : null })));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
  const { serviceProviderId, serviceDescription, agreedAmount, paidAmount, dueDate, paymentDate, status, notes } = body;
  if (!serviceProviderId) return apiError("Prestador é obrigatório");
  if (!serviceDescription?.trim()) return apiError("Descrição do serviço é obrigatória");
  const provider = await prisma.partnershipProvider.create({
    data: {
      projectId: params.id, serviceProviderId, serviceDescription: serviceDescription.trim(),
      agreedAmount: agreedAmount ? parseFloat(agreedAmount) : null,
      paidAmount: paidAmount ? parseFloat(paidAmount) : null,
      dueDate: dueDate ? new Date(dueDate + "T12:00:00.000Z") : null,
      paymentDate: paymentDate ? new Date(paymentDate + "T12:00:00.000Z") : null,
      status: status ?? "PENDING", notes: notes || null,
    },
    include: { serviceProvider: { select: { id: true, name: true, specialty: true, phone: true } } },
  });
  return apiSuccess({ ...provider, agreedAmount: provider.agreedAmount ? Number(provider.agreedAmount) : null, paidAmount: provider.paidAmount ? Number(provider.paidAmount) : null });
}
