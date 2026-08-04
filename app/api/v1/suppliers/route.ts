/**
 * Respostas no envelope { success, data } — é o que `request()` em
 * lib/api-client.ts exige (`if (!res.ok || !json.success) throw`). Estas rotas
 * devolviam o objeto cru, então a tela de Fornecedores lançava
 * "Erro desconhecido" mesmo quando o registro era criado com sucesso.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { supplierSchema } from "@/lib/validations";
import { getSessionFromRequest } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpfCnpj: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return apiSuccess(suppliers);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const parsed = await validateBody(request, supplierSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { name, category, cpfCnpj, phone, email, notes } = body;

  if (!name?.trim()) {
    return apiError("Nome é obrigatório");
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      category: category || null,
      cpfCnpj: cpfCnpj || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
    },
  });

  return apiSuccess(supplier);
}
