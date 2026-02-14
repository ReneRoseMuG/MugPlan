import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as noteTemplatesService from "../services/noteTemplatesService";

export async function listNoteTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.active !== "false";
    const templates = await noteTemplatesService.listNoteTemplates(activeOnly);
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

export async function createNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.noteTemplates.create.input.parse(req.body);
    const template = await noteTemplatesService.createNoteTemplate(input);
    res.status(201).json(template);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templateId = Number(req.params.id);
    const input = api.noteTemplates.update.input.parse(req.body);
    const template = await noteTemplatesService.updateNoteTemplate(templateId, input);
    if (!template) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(template);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof noteTemplatesService.NoteTemplatesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.noteTemplates.delete.input.parse(req.body);
    await noteTemplatesService.deleteNoteTemplate(Number(req.params.id), input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof noteTemplatesService.NoteTemplatesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
