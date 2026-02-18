import type { Request, Response, NextFunction } from "express";
import type { InsertProjectAttachment } from "@shared/schema";
import { sendAttachmentDownload } from "../lib/attachmentDownload";
import {
  MAX_UPLOAD_BYTES,
  buildStoredFilename,
  resolveMimeType,
  sanitizeFilename,
  writeAttachmentBuffer,
} from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import * as projectAttachmentsService from "../services/projectAttachmentsService";

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
    const uniqueName = buildStoredFilename(originalName);
    const storagePath = await writeAttachmentBuffer(uniqueName, parsed.buffer);

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
    sendAttachmentDownload(
      res,
      {
        mimeType: attachment.mimeType,
        originalName: attachment.originalName,
        storagePath: attachment.storagePath,
      },
      forceDownload,
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectAttachment(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Deletion is intentionally disabled system-wide.
    res.status(405).json({ message: "Attachment deletion is disabled" });
  } catch (err) {
    next(err);
  }
}
