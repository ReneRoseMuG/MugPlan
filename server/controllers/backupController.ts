import type { NextFunction, Request, Response } from "express";
import * as backupService from "../services/backupService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listBackupLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const payload = await backupService.listBackupLogs({ roleKey });
    res.json(payload);
  } catch (error) {
    if (backupService.isBackupServiceError(error)) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    next(error);
  }
}

export async function downloadBackupFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const backupLogId = Number(req.params.id);
    const kind = req.params.kind === "excel" || req.params.kind === "pdf" ? req.params.kind : null;
    if (!Number.isInteger(backupLogId) || backupLogId <= 0 || !kind) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const file = await backupService.resolveBackupDownloadPath({ roleKey }, backupLogId, kind);
    res.download(file.filePath, file.fileName);
  } catch (error) {
    if (backupService.isBackupServiceError(error)) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    next(error);
  }
}

