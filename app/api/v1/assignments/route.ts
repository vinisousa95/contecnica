import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assignmentSchema } from "@/lib/validations";
import { apiSuccess, apiError, getPaginationParams } from "@/lib/utils";
import { notifyAssignment } from "@/lib/whatsapp/notify-assignment";
import { autoCompleteInProgress } from "@/lib/assignments-autocomplete";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Encerra sozinho os "Em Andamento" cujo 17:00 já passou, antes de listar.
  await autoCompleteInProgress();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { employee: { name: { contains: search, mode: "insensitive" } } },
      { project: { name: { contains: search, mode: "insensitive" } } },
      { personalProject: { name: { contains: search, mode: "insensitive" } } },
      { partnershipProject: { name: { contains: search, mode: "insensitive" } } },
      { vehicle: { name: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (projectId) where.projectId = projectId;

  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const [assignments, total] = await Promise.all([
    prisma.workAssignment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        employee: { select: { id: true, name: true, role: true, cpf: true, rg: true, dailyRate: true } },
        vehicle: { select: { id: true, name: true, plate: true, color: true, model: true } },
        project: { select: { id: true, name: true } },
        personalProject: { select: { id: true, name: true } },
        partnershipProject: { select: { id: true, name: true } },
        expense: { select: { id: true, status: true, paymentDate: true, amount: true } },
      },
    }),
    prisma.workAssignment.count({ where }),
  ]);

  // `obra` unificada: nome + para onde a linha aponta, seja qual for o tipo.
  const withObra = assignments.map((a: any) => ({
    ...a,
    obra: a.project
      ? { id: a.project.id, name: a.project.name, href: `/obras/${a.project.id}` }
      : a.personalProject
      ? { id: a.personalProject.id, name: a.personalProject.name, href: `/obras-pessoais/${a.personalProject.id}` }
      : a.partnershipProject
      ? { id: a.partnershipProject.id, name: a.partnershipProject.name, href: `/obras-parcerias/${a.partnershipProject.id}` }
      : null,
  }));

  return apiSuccess(withObra, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { date, vehicleId, projectId, personalProjectId, partnershipProjectId, ...rest } = parsed.data;
    const workDate = new Date(date + "T12:00:00.000Z");

    const assignment = await prisma.workAssignment.create({
      data: {
        ...rest,
        date: workDate,
        vehicleId: vehicleId || null,
        projectId: projectId || null,
        personalProjectId: personalProjectId || null,
        partnershipProjectId: partnershipProjectId || null,
      },
      include: {
        employee: { select: { id: true, name: true, role: true, dailyRate: true } },
        vehicle: { select: { id: true, name: true, plate: true } },
        project: { select: { id: true, name: true } },
        personalProject: { select: { id: true, name: true } },
        partnershipProject: { select: { id: true, name: true } },
      },
    });

    // Diária automática, quando o funcionário tem valor de diária. Vai para a
    // despesa da obra do tipo escolhido: obra normal → Expense (com vínculo em
    // expenseId); pessoal → PersonalProjectExpense; parceria → PartnershipExpense.
    // Os dois últimos não têm coluna de vínculo no deslocamento, mas registram o
    // custo de mão de obra na obra certa.
    if ((assignment.employee as any).dailyRate) {
      const dailyRate = Number((assignment.employee as any).dailyRate);

      if (projectId) {
        const laborCategory = await prisma.category.findFirst({
          where: { name: { contains: "Mão de Obra", mode: "insensitive" }, type: { in: ["EXPENSE", "BOTH"] } },
          select: { id: true },
        });
        const expense = await prisma.expense.create({
          data: {
            description: `Diária — ${assignment.employee.name}`,
            supplier: assignment.employee.name,
            amount: dailyRate,
            dueDate: workDate,
            status: "PENDING",
            projectId,
            categoryId: laborCategory?.id ?? null,
            createdById: session.userId,
          },
        });
        await prisma.workAssignment.update({
          where: { id: assignment.id },
          data: { expenseId: expense.id },
        });
        (assignment as any).expenseId = expense.id;
        (assignment as any).expense = { id: expense.id, status: "PENDING", paymentDate: null, amount: dailyRate };
      } else if (personalProjectId) {
        await prisma.personalProjectExpense.create({
          data: {
            projectId: personalProjectId,
            description: `Diária — ${assignment.employee.name}`,
            category: "mao_de_obra",
            amount: dailyRate,
            date: workDate,
            status: "PENDING",
          },
        });
      } else if (partnershipProjectId) {
        await prisma.partnershipExpense.create({
          data: {
            projectId: partnershipProjectId,
            description: `Diária — ${assignment.employee.name}`,
            category: "mao_de_obra",
            amount: dailyRate,
            date: workDate,
            status: "PENDING",
          },
        });
      }
    }

    // Avisa o funcionário no WhatsApp. `await` de propósito: assim o resultado
    // já está gravado no log quando a resposta volta, e em serverless a função
    // não é encerrada no meio do envio. notifyAssignment nunca lança.
    await notifyAssignment(assignment.id, "ASSIGNMENT_CREATED");

    return apiSuccess(assignment);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao criar registro", 500);
  }
}
