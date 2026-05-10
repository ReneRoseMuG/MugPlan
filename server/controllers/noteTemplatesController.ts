import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as noteTemplatesService from "../services/noteTemplatesService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function canManageNoteTemplates(roleKey: string | undefined): boolean {
  return roleKey === "ADMIN" || roleKey === "DISPONENT";
}

function hasCardColorInput(input: { cardColor?: string | null }): boolean {
  return Object.prototype.hasOwnProperty.call(input, "cardColor");
}

function rejectMissingRole(res: Response): void {
  res.status(401).json({ code: "UNAUTHORIZED" });
}

function rejectForbidden(res: Response): void {
  res.status(403).json({ code: "FORBIDDEN" });
}

export async function listNoteTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.active !== "false";
    if (!activeOnly && !canManageNoteTemplates(getRoleKeyFromRequest(req))) {
      rejectForbidden(res);
      return;
    }
    const templates = await noteTemplatesService.listNoteTemplates(activeOnly);
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

export async function createNoteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      rejectMissingRole(res);
      return;
    }
    if (!canManageNoteTemplates(roleKey)) {
      rejectForbidden(res);
      return;
    }
    const input = api.noteTemplates.create.input.parse(req.body);
    if (roleKey !== "ADMIN" && hasCardColorInput(input)) {
      rejectForbidden(res);
      return;
    }
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
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      rejectMissingRole(res);
      return;
    }
    if (!canManageNoteTemplates(roleKey)) {
      rejectForbidden(res);
      return;
    }
    const templateId = Number(req.params.id);
    const input = api.noteTemplates.update.input.parse(req.body);
    if (roleKey !== "ADMIN" && hasCardColorInput(input)) {
      rejectForbidden(res);
      return;
    }
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
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      rejectMissingRole(res);
      return;
    }
    if (!canManageNoteTemplates(roleKey)) {
      rejectForbidden(res);
      return;
    }
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
