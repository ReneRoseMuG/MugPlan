import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as noteTemplatesService from "../services/noteTemplatesService";
import { handleZodError } from "./validation";

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
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templateId = Number(req.params.id);
    const input = api.noteTemplates.update.input.parse(req.body);
    const template = await noteTemplatesService.updateNoteTemplate(templateId, input);
    if (!template) {
      res.status(404).json({ message: "Note template not found" });
      return;
    }
    res.json(template);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await noteTemplatesService.deleteNoteTemplate(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
