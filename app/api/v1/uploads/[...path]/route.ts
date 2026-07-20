import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, normalize, basename, sep } from "path";
import { UPLOAD_BASE } from "@/lib/upload-config";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
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

  let buffer: Buffer | null = null;

  // Try primary location (.uploads/ or UPLOAD_DIR env var)
  try { buffer = await readFile(primaryPath); } catch (e: any) {
    console.error("[uploads] primary failed:", primaryPath, e?.message);
  }

  // Fallback to legacy public/uploads/ for files uploaded before the path change
  if (!buffer) {
    try { buffer = await readFile(legacyPath); } catch (e: any) {
      console.error("[uploads] legacy failed:", legacyPath, e?.message);
    }
  }

  if (!buffer) {
    console.error("[uploads] 404 - UPLOAD_BASE:", UPLOAD_BASE, "filePath:", filePath);
    return new NextResponse(null, { status: 404 });
  }

  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // inline forces browser to DISPLAY the file, not download it
      "Content-Disposition": ext === ".pdf" ? "inline" : `inline; filename="${fileName}"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
