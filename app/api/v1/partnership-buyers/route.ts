import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { partnershipBuyerSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const where: any = search ? { name: { contains: search, mode: "insensitive" } } : {};
  const buyers = await prisma.partnershipBuyer.findMany({ where, orderBy: { name: "asc" } });
  return apiSuccess(buyers);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const parsed = await validateBody(request, partnershipBuyerSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { name, cpfCnpj, phone, email, address, city, state, notes } = body;
  if (!name?.trim()) return apiError("Nome é obrigatório");
  const buyer = await prisma.partnershipBuyer.create({
    data: { name: name.trim(), cpfCnpj: cpfCnpj || null, phone: phone || null, email: email || null, address: address || null, city: city || null, state: state || null, notes: notes || null },
  });
  return apiSuccess(buyer);
}
