import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  fileUrl: z.string().min(1),
  type: z.enum(["CONTRACT", "BUDGET", "INVOICE", "REPORT", "OTHER"]).default("OTHER"),
  visible: z.boolean().default(true),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const documents = await prisma.projectDocument.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(documents);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return apiError("Obra não encontrada", 404);

  const body = await request.json();
  const data = schema.parse(body);

  const doc = await prisma.projectDocument.create({
    data: { projectId: params.id, ...data },
  });

  return apiSuccess(doc);
}
