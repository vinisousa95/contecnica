import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, normalize } from "path";
import { getSessionFromRequest } from "@/lib/auth";
import { UPLOAD_BASE } from "@/lib/upload-config";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

// Fallback: old location before the storage path change
const LEGACY_BASE = join(process.cwd(), "public", "uploads");

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return new NextResponse(null, { status: 401 });

  const filePath = params.path.join("/");
  const fullPath = normalize(join(UPLOAD_BASE, filePath));

  // Prevent path traversal
  if (!fullPath.startsWith(UPLOAD_BASE + "/")) {
    return new NextResponse(null, { status: 400 });
  }

  let buffer: Buffer | null = null;

  // Try primary location (.uploads/ or UPLOAD_DIR)
  try {
    buffer = await readFile(fullPath);
  } catch {}

  // Fallback to legacy public/uploads/ location
  if (!buffer) {
    try {
      buffer = await readFile(normalize(join(LEGACY_BASE, filePath)));
    } catch {}
  }

  if (!buffer) return new NextResponse(null, { status: 404 });

  const ext = extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
