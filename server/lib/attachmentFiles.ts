import crypto from "crypto";
import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.resolve(process.cwd(), "server/uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function ensureUploadDir(): void {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[/\\?%*:|"<>]/g, "_");
}

export function resolveMimeType(filename: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

export function buildStoredFilename(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
}

export function writeAttachmentBuffer(storedFilename: string, buffer: Buffer): string {
  ensureUploadDir();
  const storagePath = path.resolve(UPLOAD_DIR, storedFilename);
  fs.writeFileSync(storagePath, buffer);
  return storagePath;
}
