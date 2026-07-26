import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, normalize, basename, sep } from "path";
import { UPLOAD_BASE } from "@/lib/upload-config";
import { getSessionFromRequest } from "@/lib/session";
import { getPortalSessionFromRequest } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";

/**
 * Serve arquivos enviados (fotos, documentos, contratos assinados).
 *
 * Esta rota exige sessão. Antes era pública: como o middleware libera caminhos
 * que contêm "." (para arquivos estáticos), qualquer pessoa com a URL baixava
 * contratos assinados e documentos de obra sem login.
 *
 * Regras:
 *   - sessão admin: acessa tudo;
 *   - sessão do portal: acessa, e em `contracts/` só o contrato do próprio
 *     cliente (o ID do contrato está no nome do arquivo);
 *   - sem sessão: 404 (não 401, para não confirmar a existência do arquivo).
 */

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

// Fallback: old location (public/uploads/) used before the storage path change
const LEGACY_BASE = join(process.cwd(), "public", "uploads");

const notFound = () => new NextResponse(null, { status: 404 });

/** `contract-signed-<contractId>-<timestamp>.pdf` → contractId */
function contractIdFromName(fileName: string): string | null {
  const m = fileName.match(/^contract-signed-([^-]+)-\d+\./);
  return m ? m[1] : null;
}

async function isAuthorized(request: NextRequest, filePath: string, fileName: string) {
  if (await getSessionFromRequest(request)) return true;

  const portal = await getPortalSessionFromRequest(request);
  if (!portal) return false;

  // Cliente do portal só pega o contrato assinado dele.
  if (filePath.startsWith("contracts/")) {
    const contractId = contractIdFromName(fileName);
    if (!contractId) return false;
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, clientId: portal.clientId },
      select: { id: true },
    });
    return !!contract;
  }

  return true;
}

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const filePath = params.path.join("/");

  // Use filename for content-type detection (not the full path, which may differ in fallback)
  const fileName = basename(filePath);
  const ext = extname(fileName).toLowerCase();

  // Security: prevent path traversal — use sep so it works on both Windows (\) and Linux (/)
  const primaryPath = normalize(join(UPLOAD_BASE, filePath));
  const legacyPath = normalize(join(LEGACY_BASE, filePath));

  const inPrimary = primaryPath.startsWith(UPLOAD_BASE + sep) || primaryPath.startsWith(UPLOAD_BASE + "/");
  const inLegacy = legacyPath.startsWith(LEGACY_BASE + sep) || legacyPath.startsWith(LEGACY_BASE + "/");

  if (!inPrimary && !inLegacy) {
    return new NextResponse(null, { status: 400 });
  }

  if (!(await isAuthorized(request, filePath, fileName))) return notFound();

  let buffer: Buffer | null = null;

  // Try primary location (.uploads/ or UPLOAD_DIR env var)
  try { buffer = await readFile(primaryPath); } catch {}

  // Fallback to legacy public/uploads/ for files uploaded before the path change
  if (!buffer) {
    try { buffer = await readFile(legacyPath); } catch {}
  }

  if (!buffer) return notFound();

  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  // new Uint8Array: BodyInit aceita Uint8Array, não Buffer (tipos do Node 22).
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      // inline forces browser to DISPLAY the file, not download it
      "Content-Disposition": ext === ".pdf" ? "inline" : `inline; filename="${fileName}"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
