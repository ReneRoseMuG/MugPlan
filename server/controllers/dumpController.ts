import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import { parseMultipartForm } from "../lib/multipart";
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

export async function previewDumpImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    let parsedForm: Awaited<ReturnType<typeof parseMultipartForm>>;
    try {
      parsedForm = await parseMultipartForm(req, {
        fieldName: "file",
        maxSizeBytes: MAX_DUMP_IMPORT_BYTES,
      });
    } catch {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    if (!parsedForm.file) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const payload = await dumpService.previewDumpImport({ roleKey }, parsedForm.file.buffer);
    res.json(payload);
  } catch (error) {
    if (dumpService.isDumpServiceError(error)) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    next(error);
  }
}

export async function applyDumpImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    let parsedForm: Awaited<ReturnType<typeof parseMultipartForm>>;
    try {
      parsedForm = await parseMultipartForm(req, {
        fieldName: "file",
        maxSizeBytes: MAX_DUMP_IMPORT_BYTES,
      });
    } catch {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    if (!parsedForm.file) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const fileHash = parsedForm.fields["fileHash"];
    const confirmationPhrase = parsedForm.fields["confirmationPhrase"];
    const productionConfirmationText = parsedForm.fields["productionConfirmationText"];
    if (
      typeof fileHash !== "string" || fileHash.trim().length === 0
      || typeof confirmationPhrase !== "string" || confirmationPhrase.trim().length === 0
      || typeof productionConfirmationText !== "string" || productionConfirmationText.trim().length === 0
    ) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const payload = await dumpService.applyDumpImport({ roleKey }, {
      fileBuffer: parsedForm.file.buffer,
      fileHash,
      confirmationPhrase,
      productionConfirmationText,
    });
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
