import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import { apiError } from "@/lib/utils";
import { UPLOAD_BASE } from "@/lib/upload-config";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData: any = await request.formData();
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

    const ext = MIME_TO_EXT[file.type] ?? "bin";
    // randomUUID (CSPRNG) em vez de Math.random: nomes de arquivo não devem
    // ser previsíveis, já que a URL é o identificador do arquivo.
    const safeName = `${Date.now()}-${randomUUID()}.${ext}`;
    const subdir = type === "document" ? "documents" : "photos";

    const uploadDir = join(UPLOAD_BASE, subdir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, safeName), buffer);

    const url = `/api/v1/uploads/${subdir}/${safeName}`;
    return NextResponse.json({ success: true, data: { url } }, { status: 200 });
  } catch (err: any) {
    // Detalhe fica no log do servidor. Devolver err.message ao navegador expunha
    // caminho de diretório e detalhes de infraestrutura (era a única rota que
    // ainda fazia isso). O caso EACCES está documentado em docs/ — quem opera o
    // servidor encontra a causa no log do PM2.
    console.error("[upload] base:", UPLOAD_BASE, "| code:", err?.code, "| err:", err?.message);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o arquivo. Tente novamente." },
      { status: 500 }
    );
  }
}
