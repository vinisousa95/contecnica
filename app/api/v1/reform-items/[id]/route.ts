import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { reformItemSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = reformItemSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { priceLow, priceMedium, priceHigh, ...rest } = parsed.data;

    const item = await prisma.reformItem.update({
      where: { id: params.id },
      data: {
        ...rest,
        priceLow: parseFloat(priceLow),
        priceMedium: parseFloat(priceMedium),
        priceHigh: parseFloat(priceHigh),
      } as any,
    });

    return apiSuccess({
      ...item,
      priceLow: Number(item.priceLow),
      priceMedium: Number(item.priceMedium),
      priceHigh: Number(item.priceHigh),
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return apiError("Item não encontrado", 404);
    return apiError("Erro ao atualizar item", 500);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const hard = searchParams.get("hard") === "true";

  if (hard) {
    try {
      const inUse = await prisma.budgetItem.count({ where: { reformItemId: params.id } });
      if (inUse > 0) {
        return apiError(
          `Não é possível excluir: item já usado em ${inUse} orçamento(s). Desative-o para manter o histórico.`
        );
      }
      await prisma.reformItem.delete({ where: { id: params.id } });
      return apiSuccess({ message: "Item excluído permanentemente" });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2025") return apiError("Item não encontrado", 404);
      return apiError("Erro ao excluir item", 500);
    }
  }

  // Soft-delete — apenas desativa
  try {
    await prisma.reformItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return apiSuccess({ message: "Item desativado com sucesso" });
  } catch {
    return apiError("Erro ao desativar item", 500);
  }
}
