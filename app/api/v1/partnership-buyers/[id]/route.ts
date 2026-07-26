import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { partnershipBuyerSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const buyer = await prisma.partnershipBuyer.findUnique({ where: { id: params.id }, include: { projects: { select: { id: true, name: true, status: true } } } });
  if (!buyer) return apiError("Comprador não encontrado", 404);
  return apiSuccess(buyer);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const parsed = await validateBody(request, partnershipBuyerSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { name, cpfCnpj, phone, email, address, city, state, notes, status } = body;
  if (!name?.trim()) return apiError("Nome é obrigatório");
  const buyer = await prisma.partnershipBuyer.update({
    where: { id: params.id },
    data: { name: name.trim(), cpfCnpj: cpfCnpj || null, phone: phone || null, email: email || null, address: address || null, city: city || null, state: state || null, notes: notes || null, status: status ?? "ACTIVE" },
  });
  return apiSuccess(buyer);
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  try {
    await prisma.partnershipBuyer.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Excluído com sucesso" });
  } catch {
    return apiError("Erro ao excluir. Verifique se há obras vinculadas.", 400);
  }
}
