import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeAdvanceSchema } from "@/lib/validations";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAdvanceBalances } from "@/lib/advances";

// GET /api/v1/advances → lançamentos de adiantamento + saldo por funcionário
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const [advances, balances] = await Promise.all([
    prisma.employeeAdvance.findMany({
      include: { employee: { select: { id: true, name: true, role: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    getAdvanceBalances(),
  ]);

  // Monta saldo só dos funcionários com adiantamento.
  const empName = new Map<string, { name: string; role: string | null }>();
  for (const a of advances) empName.set(a.employeeId, { name: a.employee.name, role: a.employee.role });

  const saldo = Object.entries(balances).map(([employeeId, b]) => ({
    employeeId,
    name: empName.get(employeeId)?.name ?? "—",
    role: empName.get(employeeId)?.role ?? null,
    ...b,
  }));

  return apiSuccess({
    advances: advances.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      date: a.date,
      notes: a.notes,
      employee: { id: a.employee.id, name: a.employee.name, role: a.employee.role },
    })),
    saldo,
  });
}

// POST /api/v1/advances → registra um adiantamento
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  try {
    const body = await request.json();
    const parsed = employeeAdvanceSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const { employeeId, amount, date, notes } = parsed.data;
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) return apiError("Funcionário não encontrado", 404);

    const advance = await prisma.employeeAdvance.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        date: new Date(date + "T12:00:00.000Z"),
        notes: notes?.trim() || null,
        createdById: session.userId,
      },
    });

    return apiSuccess({ id: advance.id });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao registrar adiantamento", 500);
  }
}
