import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const materials = await prisma.partnershipMaterial.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess(materials.map(m => ({ ...m, quantity: Number(m.quantity), unitPrice: Number(m.unitPrice), total: Number(m.total) })));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
  const { description, supplier, quantity, unitPrice, date, paymentMethod, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const material = await prisma.partnershipMaterial.create({
    data: {
      projectId: params.id, description: description.trim(), supplier: supplier || null,
      quantity: qty, unitPrice: price, total: qty * price,
      date: date ? new Date(date + "T12:00:00.000Z") : null,
      paymentMethod: paymentMethod || null, notes: notes || null,
    },
  });
  return apiSuccess({ ...material, quantity: Number(material.quantity), unitPrice: Number(material.unitPrice), total: Number(material.total) });
}
