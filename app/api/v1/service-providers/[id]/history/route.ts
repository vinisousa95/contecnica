import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const links = await prisma.workServiceProvider.findMany({
    where: { serviceProviderId: params.id },
    include: {
      project: { select: { id: true, name: true, status: true, city: true } },
      expense: { select: { id: true, status: true, amount: true, paymentDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(links);
}
