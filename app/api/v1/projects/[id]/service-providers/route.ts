import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { workServiceProviderSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const links = await prisma.workServiceProvider.findMany({
    where: { projectId: params.id },
    include: {
      serviceProvider: true,
      expense: { select: { id: true, status: true, amount: true, paymentDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(links);
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = workServiceProviderSchema.safeParse({ ...body, projectId: params.id });

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { generateExpense, agreedAmount, paidAmount, startDate, expectedEndDate, ...rest } = parsed.data;

    const data: Record<string, unknown> = {
      ...rest,
      projectId: params.id,
      ...(agreedAmount ? { agreedAmount } : {}),
      ...(paidAmount ? { paidAmount } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(expectedEndDate ? { expectedEndDate: new Date(expectedEndDate) } : {}),
    };

    if (generateExpense && agreedAmount) {
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: rest.serviceProviderId },
        select: { name: true },
      });

      const expense = await prisma.expense.create({
        data: {
          projectId: params.id,
          description: `Prestador: ${provider?.name ?? rest.serviceProviderId} — ${rest.serviceDescription}`,
          amount: agreedAmount,
          dueDate: expectedEndDate ? new Date(expectedEndDate) : new Date(),
          status: "PENDING",
          createdById: session.userId,
        },
      });
      data.expenseId = expense.id;
    }

    const link = await prisma.workServiceProvider.create({
      data: data as any,
      include: {
        serviceProvider: true,
        expense: { select: { id: true, status: true, amount: true } },
      },
    });

    return apiSuccess(link);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao vincular prestador", 500);
  }
}
