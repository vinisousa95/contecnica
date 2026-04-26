import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, clientId: session.clientId, status: "SENT" },
  });
  if (!contract) return apiError("Contrato não encontrado", 404);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("Arquivo obrigatório");

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) return apiError("Apenas PDF ou imagem");
    if (file.size > 20 * 1024 * 1024) return apiError("Arquivo muito grande (máx 20MB)");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const safeName = `contract-signed-${params.id}-${Date.now()}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads", "contracts");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, safeName), buffer);

    const signedFileUrl = `/uploads/contracts/${safeName}`;

    const updated = await prisma.contract.update({
      where: { id: params.id },
      data: { signedFileUrl, signedAt: new Date(), status: "SIGNED" },
    });

    return apiSuccess({ signedFileUrl: updated.signedFileUrl });
  } catch (err: any) {
    console.error("[portal sign contract]", err);
    return apiError("Erro ao processar arquivo");
  }
}
