import type { Request, Response, NextFunction } from "express";
import type { InsertAppointmentAttachment } from "@shared/schema";
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
import * as appointmentAttachmentsService from "../services/appointmentAttachmentsService";
import * as appointmentsService from "../services/appointmentsService";
import * as journalService from "../services/journalService";

export async function listAppointmentAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.appointmentId);
    if (!Number.isFinite(appointmentId)) {
      res.status(400).json({ message: "Ungueltige appointmentId" });
      return;
    }
    const attachments = await appointmentAttachmentsService.listAppointmentAttachments(appointmentId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function createAppointmentAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const appointmentId = Number(req.params.appointmentId);
    if (!Number.isFinite(appointmentId)) {
      res.status(400).json({ message: "Ungueltige appointmentId" });
      return;
    }
    const exists = await appointmentAttachmentsService.appointmentExists(appointmentId);
    if (!exists) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }

    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });

    const originalName = sanitizeFilename(parsed.filename);
    const uniqueName = buildStoredFilename(originalName);
    const storagePath = await writeAttachmentBuffer(uniqueName, parsed.buffer);

    const attachmentData: InsertAppointmentAttachment = {
      appointmentId,
      filename: uniqueName,
      originalName,
      mimeType: resolveMimeType(originalName, parsed.contentType),
      fileSize: parsed.buffer.length,
      storagePath,
    };

    const created = await appointmentAttachmentsService.createAppointmentAttachment(attachmentData);
    const appointment = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment_attachment",
      recordId: created.id,
      op: "create",
      newValue: created,
      snapshot: created,
      actor: getRequestActor(req),
      triggerKey: "appointment.attachment.create",
      messageText: buildAttachmentMessage("hochgeladen", "appointment", appointment, created.originalName, appointmentId),
      contexts: [
        {
          tableName: "appointment",
          recordId: appointmentId,
          relationRole: "owner",
        },
      ],
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ message: "Datei ist zu gross (max. 10 MB)." });
      return;
    }
    next(err);
  }
}

export async function downloadAppointmentAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attachmentId = Number(req.params.id);
    if (!Number.isFinite(attachmentId)) {
      res.status(400).json({ message: "Ungueltige Attachment-ID" });
      return;
    }

    const attachment = await appointmentAttachmentsService.getAppointmentAttachmentById(attachmentId);
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

export async function deleteAppointmentAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const attachment = await appointmentAttachmentsService.getAppointmentAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ message: "Anhang nicht gefunden" });
      return;
    }

    const isHistorical = await appointmentAttachmentsService.isAppointmentAttachmentHistorical(attachmentId);
    if (isHistorical) {
      res.status(403).json({ code: "HISTORICAL_APPOINTMENT" });
      return;
    }

    const mode = req.query.mode === "hard" ? "hard" : "soft";

    if (mode === "hard") {
      await deleteAttachmentFile(attachment.filename, attachment.storagePath);
    }

    await appointmentAttachmentsService.softDeleteAppointmentAttachment(attachmentId);
    const appointment = await appointmentsService.getAppointmentDetails(attachment.appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment_attachment",
      recordId: attachment.id,
      op: "delete",
      oldValue: attachment,
      snapshot: attachment,
      actor: getRequestActor(req),
      triggerKey: "appointment.attachment.delete",
      messageText: buildAttachmentMessage("geloescht", "appointment", appointment, attachment.originalName, attachment.appointmentId),
      contexts: [
        {
          tableName: "appointment",
          recordId: attachment.appointmentId,
          relationRole: "owner",
        },
      ],
    });
    res.status(200).json({ message: "Anhang geloescht" });
  } catch (err) {
    next(err);
  }
}
