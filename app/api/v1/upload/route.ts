import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { apiError } from "@/lib/utils";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Whitelist de extensões por MIME — evita path traversal via extensão
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return apiError("Não autorizado", 401);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) return apiError("Nenhum arquivo enviado", 400);
    if (file.size > MAX_SIZE) return apiError("Arquivo muito grande (máx 10MB)", 400);

    const allowed = type === "document" ? ALLOWED_DOC : ALLOWED_IMAGE;
    if (!allowed.includes(file.type)) {
      return apiError("Tipo de arquivo não permitido", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extensão derivada do MIME type (não do nome do arquivo) — evita path traversal
    const ext = MIME_TO_EXT[file.type] ?? "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const subdir = type === "document" ? "documents" : "photos";

    const uploadDir = join(process.cwd(), "public", "uploads", subdir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, safeName), buffer);

    const url = `/api/v1/uploads/${subdir}/${safeName}`;
    return NextResponse.json({ success: true, data: { url } }, { status: 200 });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ success: false, error: "Erro ao fazer upload" }, { status: 500 });
  }
}
