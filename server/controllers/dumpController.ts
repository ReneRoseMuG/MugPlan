import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import { parseMultipartFile } from "../lib/multipart";
import * as dumpService from "../services/dumpService";

const MAX_DUMP_IMPORT_BYTES = 500 * 1024 * 1024; // 500 MB

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function createDump(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const payload = await dumpService.createDump({ roleKey });
    res.json(payload);
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function listDumps(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const payload = await dumpService.listDumps({ roleKey });
    res.json(payload);
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function downloadDump(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const filename = Array.isArray(req.params["filename"]) ? req.params["filename"][0] : req.params["filename"];
    if (!filename) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    const file = await dumpService.resolveDumpDownloadPath({ roleKey }, filename);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    res.setHeader("Content-Type", "application/zip");

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(file.filePath);
      stream.on("error", reject);
      res.on("finish", () => resolve());
      stream.pipe(res);
    });
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function importDump(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    let fileBuffer: Buffer;
    try {
      const file = await parseMultipartFile(req, {
        fieldName: "file",
        maxSizeBytes: MAX_DUMP_IMPORT_BYTES,
      });
      fileBuffer = file.buffer;
    } catch {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const payload = await dumpService.importDump({ roleKey }, fileBuffer);
    res.json(payload);
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    next(error);
  }
}

export async function deleteDump(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const filename = Array.isArray(req.params["filename"]) ? req.params["filename"][0] : req.params["filename"];
    if (!filename) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    const payload = await dumpService.deleteDump({ roleKey }, filename);
    res.json(payload);
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}
