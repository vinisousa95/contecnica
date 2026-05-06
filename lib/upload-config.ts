import { join } from "path";

// Use UPLOAD_DIR env var if set (e.g. UPLOAD_DIR=/home/ubuntu/uploads in PM2 config),
// otherwise defaults to .uploads/ at project root (created with process user permissions).
export const UPLOAD_BASE = process.env.UPLOAD_DIR ?? join(process.cwd(), ".uploads");
