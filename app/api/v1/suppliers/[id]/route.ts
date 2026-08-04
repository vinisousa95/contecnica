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

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const parsed = await validateBody(request, supplierSchema);
  if (!parsed.ok) return apiError(parsed.error, parsed.status);
  const body = parsed.data as any;
  const { name, category, cpfCnpj, phone, email, notes } = body;

  if (!name?.trim()) {
    return apiError("Nome é obrigatório");
  }

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
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

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  await prisma.supplier.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Fornecedor removido" });
}
