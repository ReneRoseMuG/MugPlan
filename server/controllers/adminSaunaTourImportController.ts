import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { parseMultipartFile } from "../lib/multipart";
import * as saunaTourPreviewService from "../services/saunaTourPreviewService";
import { handleZodError } from "./validation";

function assertAdmin(req: Request, res: Response): boolean {
  if (req.userContext?.roleKey !== "ADMIN") {
    res.status(403).json({ code: "FORBIDDEN" });
    return false;
  }
  return true;
}

export async function createSaunaTourPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: saunaTourPreviewService.SAUNA_TOUR_PREVIEW_LIMITS.maxUploadBytes,
    });

    const result = await saunaTourPreviewService.createSaunaTourPreview({
      filename: parsed.filename,
      buffer: parsed.buffer,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof saunaTourPreviewService.SaunaTourPreviewError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "Datei zu gross." });
      return;
    }
    next(error);
  }
}

export async function getSaunaTourPreviewWeekRows(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.saunaTourImportPreviewWeekRows.input.parse(req.body);
    const result = await saunaTourPreviewService.getSaunaTourPreviewWeekRows(input);
    res.json(result);
  } catch (error) {
    if (error instanceof saunaTourPreviewService.SaunaTourPreviewError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (handleZodError(error, res)) return;
    next(error);
  }
}

export async function cleanupSaunaTourPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.saunaTourImportPreviewCleanup.input.parse(req.body);
    await saunaTourPreviewService.cleanupSaunaTourPreviewSession(input.previewSessionId);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof saunaTourPreviewService.SaunaTourPreviewError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (handleZodError(error, res)) return;
    next(error);
  }
}
