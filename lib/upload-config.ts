import { join } from "path";
import { homedir } from "os";

// Use UPLOAD_DIR env var if set (e.g. UPLOAD_DIR=/home/ubuntu/uploads in PM2 config),
// otherwise fall back to ~/.contecnica-uploads which is always writable by the process owner
// (unlike the project root, which may be owned by root in production).
export const UPLOAD_BASE = process.env.UPLOAD_DIR ?? join(homedir(), ".contecnica-uploads");
