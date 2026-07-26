import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const companySettingsSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
}).strict();

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", name: "" },
  });

  return apiSuccess(settings);
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);
  if (session.role !== "ADMIN") return apiError("Acesso restrito a administradores", 403);

  try {
    const body = await request.json();
    const parsed = companySettingsSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message);

    const settings = await prisma.companySettings.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: { id: "singleton", ...parsed.data },
    });

    return apiSuccess(settings);
  } catch (error) {
    console.error(error);
    return apiError("Erro ao salvar configurações", 500);
  }
}
