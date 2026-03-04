import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { parseMultipartFiles } from "../lib/multipart";
import * as bulkImportService from "../services/bulkImportService";
import { handleZodError } from "./validation";

function assertAdmin(req: Request, res: Response): boolean {
  if (req.userContext?.roleKey !== "ADMIN") {
    res.status(403).json({ code: "FORBIDDEN" });
    return false;
  }
  return true;
}

export async function analyzeCustomersBulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const files = await parseMultipartFiles(req, {
      fieldName: "files",
      maxSizeBytes: bulkImportService.BULK_IMPORT_LIMITS.maxTotalBytes,
    });
    const result = await bulkImportService.analyzeCustomerBulkImport(
      bulkImportService.toBulkFileInputs(files),
    );
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ code: "BULK_IMPORT_LIMIT_EXCEEDED", message: "Payload too large" });
      return;
    }
    next(err);
  }
}

export async function applyCustomersBulkImportNew(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.customerBulkImportApplyNew.input.parse(req.body);
    const result = await bulkImportService.applyNewCustomers(input.bulkImportSessionId, input.selectedIds);
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function applyCustomersBulkImportDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.customerBulkImportApplyDuplicates.input.parse(req.body);
    const result = await bulkImportService.applyDuplicateCustomers(input.bulkImportSessionId, input.selectedIds);
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function analyzeProjectsBulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const files = await parseMultipartFiles(req, {
      fieldName: "files",
      maxSizeBytes: bulkImportService.BULK_IMPORT_LIMITS.maxTotalBytes,
    });
    const result = await bulkImportService.analyzeProjectBulkImport(
      bulkImportService.toBulkFileInputs(files),
    );
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ code: "BULK_IMPORT_LIMIT_EXCEEDED", message: "Payload too large" });
      return;
    }
    next(err);
  }
}

export async function applyProjectsBulkImportNew(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.projectBulkImportApplyNew.input.parse(req.body);
    const result = await bulkImportService.applyNewProjects(input.bulkImportSessionId, input.selectedIds);
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function applyProjectsBulkImportSpecialCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.projectBulkImportApplySpecialCase.input.parse(req.body);
    const result = await bulkImportService.applyProjectSpecialCase(input.bulkImportSessionId, input.id);
    res.json(result);
  } catch (err) {
    if (err instanceof bulkImportService.BulkImportError) {
      res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      return;
    }
    if (handleZodError(err, res)) return;
    next(err);
  }
}
