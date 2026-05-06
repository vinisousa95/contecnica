import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, normalize } from "path";
import { getSessionFromRequest } from "@/lib/auth";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const UPLOAD_BASE = join(process.cwd(), "public", "uploads");

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) return new NextResponse(null, { status: 401 });

  const filePath = params.path.join("/");
  const fullPath = normalize(join(UPLOAD_BASE, filePath));

  // Prevent path traversal attacks
  if (!fullPath.startsWith(UPLOAD_BASE + "/")) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const buffer = await readFile(fullPath);
    const ext = extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
