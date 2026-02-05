import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { InsertProjectAttachment } from "@shared/schema";
import { parseMultipartFile } from "../lib/multipart";
import * as projectAttachmentsService from "../services/projectAttachmentsService";

const UPLOAD_DIR = path.resolve(process.cwd(), "server/uploads");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[/\\?%*:|"<>]/g, "_");
}

function resolveMimeType(filename: string, fallback?: string | null): string {
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

function resolveDisposition(mimeType: string, forceDownload: boolean): "inline" | "attachment" {
  if (forceDownload) return "attachment";
  if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
    return "inline";
  }
  return "attachment";
}

export async function listProjectAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const attachments = await projectAttachmentsService.listProjectAttachments(projectId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function createProjectAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) {
      res.status(400).json({ message: "Ungültige projectId" });
      return;
    }

    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });

    const originalName = sanitizeFilename(parsed.filename);
    const extension = path.extname(originalName).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
    ensureUploadDir();

    const storagePath = path.resolve(UPLOAD_DIR, uniqueName);
    fs.writeFileSync(storagePath, parsed.buffer);

    const attachmentData: InsertProjectAttachment = {
      projectId,
      filename: uniqueName,
      originalName,
      mimeType: resolveMimeType(originalName, parsed.contentType),
      fileSize: parsed.buffer.length,
      storagePath,
    };

    const created = await projectAttachmentsService.createProjectAttachment(attachmentData);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ message: "Datei ist zu groß (max. 10 MB)." });
      return;
    }
    next(err);
  }
}

export async function downloadProjectAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attachmentId = Number(req.params.id);
    if (!Number.isFinite(attachmentId)) {
      res.status(400).json({ message: "Ungültige Attachment-ID" });
      return;
    }
    const attachment = await projectAttachmentsService.getProjectAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ message: "Anhang nicht gefunden" });
      return;
    }
    const forceDownload = req.query.download === "1";
    const disposition = resolveDisposition(attachment.mimeType, forceDownload);
    const safeName = sanitizeFilename(attachment.originalName);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
    res.sendFile(path.resolve(attachment.storagePath));
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await projectAttachmentsService.deleteProjectAttachment(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
