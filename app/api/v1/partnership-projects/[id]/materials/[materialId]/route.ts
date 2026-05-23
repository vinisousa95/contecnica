import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string; materialId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
  const { description, supplier, quantity, unitPrice, date, paymentMethod, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const material = await prisma.partnershipMaterial.update({
    where: { id: params.materialId },
    data: {
      description: description.trim(), supplier: supplier || null, quantity: qty, unitPrice: price, total: qty * price,
      date: date ? new Date(date + "T12:00:00.000Z") : null, paymentMethod: paymentMethod || null, notes: notes || null,
    },
  });
  return apiSuccess({ ...material, quantity: Number(material.quantity), unitPrice: Number(material.unitPrice), total: Number(material.total) });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; materialId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  await prisma.partnershipMaterial.delete({ where: { id: params.materialId } });
  return apiSuccess({ message: "Removido" });
}
