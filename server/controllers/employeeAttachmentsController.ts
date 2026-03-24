import type { Request, Response, NextFunction } from "express";
import type { InsertEmployeeAttachment } from "@shared/schema";
import { sendAttachmentDownload } from "../lib/attachmentDownload";
import {
  MAX_UPLOAD_BYTES,
  buildStoredFilename,
  deleteAttachmentFile,
  resolveMimeType,
  sanitizeFilename,
  writeAttachmentBuffer,
} from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import * as employeeAttachmentsService from "../services/employeeAttachmentsService";

export async function listEmployeeAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isFinite(employeeId)) {
      res.status(400).json({ message: "Ungueltige employeeId" });
      return;
    }
    const attachments = await employeeAttachmentsService.listEmployeeAttachments(employeeId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function createEmployeeAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const employeeId = Number(req.params.employeeId);
    if (!Number.isFinite(employeeId)) {
      res.status(400).json({ message: "Ungueltige employeeId" });
      return;
    }
    const exists = await employeeAttachmentsService.employeeExists(employeeId);
    if (!exists) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }

    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });

    const originalName = sanitizeFilename(parsed.filename);
    const uniqueName = buildStoredFilename(originalName);
    const storagePath = await writeAttachmentBuffer(uniqueName, parsed.buffer);

    const attachmentData: InsertEmployeeAttachment = {
      employeeId,
      filename: uniqueName,
      originalName,
      mimeType: resolveMimeType(originalName, parsed.contentType),
      fileSize: parsed.buffer.length,
      storagePath,
    };

    const created = await employeeAttachmentsService.createEmployeeAttachment(attachmentData);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ message: "Datei ist zu gross (max. 10 MB)." });
      return;
    }
    next(err);
  }
}

export async function downloadEmployeeAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attachmentId = Number(req.params.id);
    if (!Number.isFinite(attachmentId)) {
      res.status(400).json({ message: "Ungueltige Attachment-ID" });
      return;
    }

    const attachment = await employeeAttachmentsService.getEmployeeAttachmentById(attachmentId);
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

export async function deleteEmployeeAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const attachmentId = Number(req.params.id);
    if (!Number.isFinite(attachmentId)) {
      res.status(400).json({ message: "Ungueltige Attachment-ID" });
      return;
    }

    const attachment = await employeeAttachmentsService.getEmployeeAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ message: "Anhang nicht gefunden" });
      return;
    }

    const mode = req.query.mode === "hard" ? "hard" : "soft";

    if (mode === "hard") {
      deleteAttachmentFile(attachment.storagePath);
    }

    await employeeAttachmentsService.softDeleteEmployeeAttachment(attachmentId);
    res.status(200).json({ message: "Anhang geloescht" });
  } catch (err) {
    next(err);
  }
}
