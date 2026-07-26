import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const serviceItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  subtotal: z.number(),
}).strict();

const installmentSchema = z.object({
  installment: z.number(),
  dueDate: z.string(),
  amount: z.number(),
  description: z.string().optional(),
}).strict();

const schema = z.object({
  templateId: z.string().optional().nullable(),
  clientId: z.string().min(1, "Cliente obrigatório"),
  projectId: z.string().optional().nullable(),
  title: z.string().min(2, "Título obrigatório"),
  body: z.string().min(10, "Conteúdo obrigatório"),
  serviceItems: z.array(serviceItemSchema).default([]),
  paymentSchedule: z.array(installmentSchema).default([]),
  variables: z.record(z.string()).default({}),
  totalAmount: z.number().default(0),
}).strict();

async function generateNumber(projectId?: string | null): Promise<string> {
  const year = new Date().getFullYear();
  // If project has a linked budget, derive number from budget code (e.g. ORC-2026-0002 → CON-2026-0002)
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { linkedBudgetId: true },
    });
    if (project?.linkedBudgetId) {
      const budget = await prisma.budget.findUnique({
        where: { id: project.linkedBudgetId },
        select: { code: true },
      });
      if (budget?.code) {
        // Extract sequential part: "ORC-2026-0002" → "0002"
        const seq = budget.code.split("-").pop() ?? "";
        if (seq) {
          const candidate = `CON-${year}-${seq}`;
          // Avoid duplicate if contract already exists with this number
          const exists = await prisma.contract.findUnique({ where: { number: candidate }, select: { id: true } });
          if (!exists) return candidate;
        }
      }
    }
  }
  const count = await prisma.contract.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `CON-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const search = searchParams.get("search");

  const where: any = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { number: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(
    contracts.map((c) => ({
      ...c,
      totalAmount: Number(c.totalAmount),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const number = await generateNumber(parsed.data.projectId);

  const contract = await prisma.contract.create({
    data: {
      number,
      templateId: parsed.data.templateId || null,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId || null,
      title: parsed.data.title,
      body: parsed.data.body,
      serviceItems: parsed.data.serviceItems,
      paymentSchedule: parsed.data.paymentSchedule,
      variables: parsed.data.variables,
      totalAmount: parsed.data.totalAmount,
      createdById: session.userId,
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return apiSuccess({ ...contract, totalAmount: Number(contract.totalAmount) });
}
