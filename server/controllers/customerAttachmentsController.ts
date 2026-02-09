import type { Request, Response, NextFunction } from "express";
import type { InsertCustomerAttachment } from "@shared/schema";
import { sendAttachmentDownload } from "../lib/attachmentDownload";
import {
  MAX_UPLOAD_BYTES,
  buildStoredFilename,
  resolveMimeType,
  sanitizeFilename,
  writeAttachmentBuffer,
} from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import * as customerAttachmentsService from "../services/customerAttachmentsService";

export async function listCustomerAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isFinite(customerId)) {
      res.status(400).json({ message: "Ungültige customerId" });
      return;
    }
    const attachments = await customerAttachmentsService.listCustomerAttachments(customerId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function createCustomerAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isFinite(customerId)) {
      res.status(400).json({ message: "Ungültige customerId" });
      return;
    }

    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });

    const originalName = sanitizeFilename(parsed.filename);
    const uniqueName = buildStoredFilename(originalName);
    const storagePath = await writeAttachmentBuffer(uniqueName, parsed.buffer);

    const attachmentData: InsertCustomerAttachment = {
      customerId,
      filename: uniqueName,
      originalName,
      mimeType: resolveMimeType(originalName, parsed.contentType),
      fileSize: parsed.buffer.length,
      storagePath,
    };

    const created = await customerAttachmentsService.createCustomerAttachment(attachmentData);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ message: "Datei ist zu groß (max. 10 MB)." });
      return;
    }
    next(err);
  }
}

export async function downloadCustomerAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attachmentId = Number(req.params.id);
    if (!Number.isFinite(attachmentId)) {
      res.status(400).json({ message: "Ungültige Attachment-ID" });
      return;
    }

    const attachment = await customerAttachmentsService.getCustomerAttachmentById(attachmentId);
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
