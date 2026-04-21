import type { Request, Response, NextFunction } from "express";
import type { InsertCustomerAttachment } from "@shared/schema";
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
import { buildAttachmentMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as customerAttachmentsService from "../services/customerAttachmentsService";
import * as journalService from "../services/journalService";

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
    await journalService.recordJournalEntry({
      tableName: "customer_attachment",
      recordId: created.id,
      op: "create",
      newValue: created,
      snapshot: created,
      actor: getRequestActor(req),
      triggerKey: "customer.attachment.create",
      messageText: buildAttachmentMessage("hochgeladen", "customer", null, created.originalName, customerId),
      contexts: [
        {
          tableName: "customer",
          recordId: customerId,
          relationRole: "owner",
        },
      ],
    });
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
    await sendAttachmentDownload(
      res,
      {
        filename: attachment.filename,
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

export async function deleteCustomerAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

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

    const mode = req.query.mode === "hard" ? "hard" : "soft";

    if (mode === "hard") {
      await deleteAttachmentFile(attachment.filename, attachment.storagePath);
    }

    await customerAttachmentsService.softDeleteCustomerAttachment(attachmentId);
    await journalService.recordJournalEntry({
      tableName: "customer_attachment",
      recordId: attachment.id,
      op: "delete",
      oldValue: attachment,
      snapshot: attachment,
      actor: getRequestActor(req),
      triggerKey: "customer.attachment.delete",
      messageText: buildAttachmentMessage("gelöscht", "customer", null, attachment.originalName, attachment.customerId),
      contexts: [
        {
          tableName: "customer",
          recordId: attachment.customerId,
          relationRole: "owner",
        },
      ],
    });
    res.status(200).json({ message: "Anhang gelöscht" });
  } catch (err) {
    next(err);
  }
}
