import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import * as documentProcessingService from "../services/documentProcessingService";
import { handleZodError } from "./validation";

function isPdfFile(filename: string, contentType: string | null): boolean {
  const normalizedName = filename.trim().toLowerCase();
  const normalizedType = (contentType ?? "").trim().toLowerCase();
  return normalizedName.endsWith(".pdf") || normalizedType === "application/pdf";
}

export async function extractDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const input = api.documentExtraction.extract.input.safeParse(req.query);
  if (!input.success) {
    res.status(400).json({
      message: input.error.errors[0]?.message ?? "Ungueltige Anfrage",
      field: input.error.errors[0]?.path.join("."),
    });
    return;
  }

  try {
    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });

    if (!isPdfFile(parsed.filename, parsed.contentType)) {
      res.status(400).json({ message: "Nur PDF-Dokumente sind erlaubt", field: "file" });
      return;
    }

    const extraction = await documentProcessingService.extractFromPdf({
      scope: input.data.scope,
      fileBuffer: parsed.buffer,
    });
    res.json(extraction);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ message: "Datei ist zu gross (max. 10 MB)." });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(422).json({
        message: err.errors[0]?.message ?? "KI-Ausgabe ist strukturell ungueltig",
        field: err.errors[0]?.path.join("."),
      });
      return;
    }
    if (err instanceof Error && err.message.includes("extrahierbaren Text")) {
      res.status(422).json({ message: err.message, field: "file" });
      return;
    }
    next(err);
  }
}

export async function checkCustomerDuplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.documentExtraction.checkCustomerDuplicate.input.parse(req.body);
    const result = await documentProcessingService.checkCustomerDuplicate(input.customerNumber);
    res.json(result);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function resolveCustomerByNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.documentExtraction.resolveCustomerByNumber.input.parse(req.body);
    const result = await documentProcessingService.resolveCustomerByNumber(input.customerNumber);
    res.json(result);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}
