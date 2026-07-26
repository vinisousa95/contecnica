import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { canAccessPersonalProject } from "@/lib/personal-project-guard";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { projectMaterialSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; materialId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectMaterial.findFirst({
    where: { id: params.materialId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Material não encontrado", 404);
  const parsed = await validateBody(request, projectMaterialSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { description, supplier, quantity, unitPrice, date, paymentMethod, notes } = body;
  if (!description?.trim()) return apiError("Descrição é obrigatória");
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const material = await prisma.personalProjectMaterial.update({
    where: { id: params.materialId },
    data: {
      description: description.trim(), supplier: supplier || null, quantity: qty, unitPrice: price, total: qty * price,
      date: date ? new Date(date + "T12:00:00.000Z") : null, paymentMethod: paymentMethod || null, notes: notes || null,
    },
  });
  return apiSuccess({ ...material, quantity: Number(material.quantity), unitPrice: Number(material.unitPrice), total: Number(material.total) });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; materialId: string }> }
) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (!(await canAccessPersonalProject(session, params.id))) {
    return apiError("Obra pessoal não encontrada", 404);
  }
  const owned = await prisma.personalProjectMaterial.findFirst({
    where: { id: params.materialId, projectId: params.id },
    select: { id: true },
  });
  if (!owned) return apiError("Material não encontrado", 404);
  await prisma.personalProjectMaterial.delete({ where: { id: params.materialId } });
  return apiSuccess({ message: "Removido" });
}
