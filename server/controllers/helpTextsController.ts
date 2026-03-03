import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as helpTextsService from "../services/helpTextsService";
import * as helpTextsYamlService from "../services/helpTextsYamlService";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { parseMultipartForm } from "../lib/multipart";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function requireAdmin(req: Request, res: Response): boolean {
  const roleKey = getRoleKeyFromRequest(req);
  if (roleKey !== "ADMIN") {
    res.status(403).json({ code: "FORBIDDEN" });
    return false;
  }
  return true;
}

export async function getHelpTextByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const helpKey = req.params.helpKey as string;
    const helpText = await helpTextsService.getHelpTextByKey(helpKey);
    if (!helpText) {
      res.json(null);
      return;
    }
    res.json({
      helpKey: helpText.helpKey,
      title: helpText.title,
      body: helpText.body,
    });
  } catch (err) {
    next(err);
  }
}

export async function listHelpTexts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query.query as string | undefined;
    const helpTexts = await helpTextsService.listHelpTexts(query);
    res.json(helpTexts);
  } catch (err) {
    next(err);
  }
}

export async function exportHelpTextsYaml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return;
    const yamlContent = await helpTextsYamlService.exportHelpTextsAsYaml();
    res.setHeader("Content-Type", "text/yaml; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="helptexts.yaml"');
    res.status(200).send(yamlContent);
  } catch (err) {
    next(err);
  }
}

export async function previewHelpTextsYamlImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return;
    const parsed = await parseMultipartForm(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
    if (!parsed.file) {
      res.status(400).json({ code: "INVALID_IMPORT_FILE" });
      return;
    }
    const result = await helpTextsYamlService.previewHelpTextsImport(parsed.file.buffer);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (
      err instanceof Error &&
      (err.message === "Missing multipart boundary" || err.message === "No file found in multipart payload")
    ) {
      res.status(400).json({ code: "INVALID_IMPORT_FILE" });
      return;
    }
    if (err instanceof helpTextsYamlService.HelpTextImportError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function applyHelpTextsYamlImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return;
    const parsed = await parseMultipartForm(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
    if (!parsed.file) {
      res.status(400).json({ code: "INVALID_IMPORT_FILE" });
      return;
    }

    const rawFileHash = parsed.fields.fileHash;
    const rawDecisions = parsed.fields.decisions;
    if (typeof rawFileHash !== "string" || rawFileHash.trim().length === 0 || typeof rawDecisions !== "string") {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    let decisions: unknown;
    try {
      decisions = JSON.parse(rawDecisions);
    } catch {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const result = await helpTextsYamlService.applyHelpTextsImport(
      parsed.file.buffer,
      rawFileHash.trim(),
      decisions,
    );
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (
      err instanceof Error &&
      (err.message === "Missing multipart boundary" || err.message === "No file found in multipart payload")
    ) {
      res.status(400).json({ code: "INVALID_IMPORT_FILE" });
      return;
    }
    if (err instanceof helpTextsYamlService.HelpTextImportError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function seedMissingHelpTextsFromFrontend(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await helpTextsService.seedMissingHelpTextsFromFrontend();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHelpTextById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const helpText = await helpTextsService.getHelpTextById(id);
    if (!helpText) {
      res.status(404).json({ message: "Hilfetext nicht gefunden" });
      return;
    }
    res.json(helpText);
  } catch (err) {
    next(err);
  }
}

export async function createHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.helpTexts.create.input.parse(req.body);
    const result = await helpTextsService.createHelpText(input);
    if (result.error) {
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
    res.status(201).json(result.helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.helpTexts.update.input.parse(req.body);
    const result = await helpTextsService.updateHelpText(id, input);
    if (result.error) {
      if (result.error === "Hilfetext nicht gefunden") {
        res.status(404).json({ code: "NOT_FOUND" });
        return;
      }
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
    res.json(result.helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function toggleHelpTextActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.helpTexts.toggleActive.input.parse(req.body);
    const helpText = await helpTextsService.toggleHelpTextActive(id, input.isActive, input.version);
    if (!helpText) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.helpTexts.delete.input.parse(req.body);
    const id = Number(req.params.id);
    const existing = await helpTextsService.getHelpTextById(id);
    if (!existing) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await helpTextsService.deleteHelpText(id, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
