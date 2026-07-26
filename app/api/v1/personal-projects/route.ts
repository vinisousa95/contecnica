import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";

const personalProjectSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  address: z.string().max(300).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  budgetedAmount: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).strict();

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  // Dados financeiros pessoais: só o próprio ADMIN dono.
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { createdById: session.userId };
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
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  const parsed = personalProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.errors[0].message);
  const d = parsed.data;

  const amount = d.budgetedAmount == null || d.budgetedAmount === "" ? null : Number(d.budgetedAmount);
  if (amount !== null && !Number.isFinite(amount)) return apiError("Valor orçado inválido");

  const project = await prisma.personalProject.create({
    data: {
      name: d.name,
      address: d.address || null,
      description: d.description || null,
      startDate: d.startDate ? new Date(d.startDate + "T12:00:00.000Z") : null,
      expectedEndDate: d.expectedEndDate ? new Date(d.expectedEndDate + "T12:00:00.000Z") : null,
      status: d.status,
      budgetedAmount: amount,
      notes: d.notes || null,
      createdById: session.userId,
    },
  });
  return apiSuccess({ ...project, budgetedAmount: project.budgetedAmount ? Number(project.budgetedAmount) : null });
}
