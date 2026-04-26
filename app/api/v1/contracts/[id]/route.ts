import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  body: z.string().min(10).optional(),
  serviceItems: z.array(z.any()).optional(),
  paymentSchedule: z.array(z.any()).optional(),
  variables: z.record(z.string()).optional(),
  totalAmount: z.number().optional(),
  status: z.enum(["DRAFT", "SENT", "SIGNED", "CANCELLED"]).optional(),
  signedFileUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      project: { select: { id: true, name: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true, description: true } },
      template: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!contract) return apiError("Contrato não encontrado", 404);

  return apiSuccess({ ...contract, totalAmount: Number(contract.totalAmount) });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  try {
    const data: any = { ...parsed.data };
    if (parsed.data.status === "SENT") data.sentAt = new Date();
    if (parsed.data.status === "SIGNED") data.signedAt = new Date();

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data,
    });
    return apiSuccess({ ...contract, totalAmount: Number(contract.totalAmount) });
  } catch {
    return apiError("Contrato não encontrado", 404);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Sem permissão", 403);

  try {
    await prisma.contract.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Contrato excluído" });
  } catch {
    return apiError("Contrato não encontrado", 404);
  }
}
