import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { address: { contains: search, mode: "insensitive" } }];
  if (status) where.status = status;
  const [projects, total] = await Promise.all([
    prisma.personalProject.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { materials: true, projectExpenses: true, projectProviders: true } } },
    }),
    prisma.personalProject.count({ where }),
  ]);
  const serialized = projects.map(p => ({ ...p, budgetedAmount: p.budgetedAmount ? Number(p.budgetedAmount) : null }));
  return apiSuccess(serialized, { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  const body = await request.json();
  const { name, address, description, startDate, expectedEndDate, status, budgetedAmount, notes } = body;
  if (!name?.trim()) return apiError("Nome é obrigatório");
  const project = await prisma.personalProject.create({
    data: {
      name: name.trim(), address: address || null, description: description || null,
      startDate: startDate ? new Date(startDate + "T12:00:00.000Z") : null,
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate + "T12:00:00.000Z") : null,
      status: status ?? "PLANNING",
      budgetedAmount: budgetedAmount ? parseFloat(budgetedAmount) : null,
      notes: notes || null,
    },
  });
  return apiSuccess({ ...project, budgetedAmount: project.budgetedAmount ? Number(project.budgetedAmount) : null });
}
