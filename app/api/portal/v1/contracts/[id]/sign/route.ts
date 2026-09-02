import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { blockedByOnboarding, impersonationBlock } from "@/lib/portal-guard";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getPortalSessionFromRequest(request);
  if (!session) return apiError("Não autorizado", 401);

  // Ato de vontade: exige o primeiro acesso concluído. Ver lib/portal-guard.ts.
  // Impersonação (admin vendo como cliente) é somente-visualização.
  const impBlock = impersonationBlock(session);
  if (impBlock) return apiError(impBlock, 403);

  const bloqueio = await blockedByOnboarding(session.clientUserId);
  if (bloqueio) return apiError(bloqueio, 403);

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
    const MIME_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
    const ext = MIME_EXT[file.type] ?? "pdf";
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
  } catch (err) {
    console.error("[portal sign contract]", err);
    return apiError("Erro ao processar arquivo");
  }
}
