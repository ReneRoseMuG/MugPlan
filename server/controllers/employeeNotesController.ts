import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as employeeNotesService from "../services/employeeNotesService";
import * as notesService from "../services/notesService";
import { EmployeesError } from "../services/employeesService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listEmployeeNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const notes = await employeeNotesService.listEmployeeNotes(employeeId, roleKey);
    if (!notes) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

export async function createEmployeeNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const input = api.employeeNotes.create.input.parse(req.body);
    const note = await employeeNotesService.createEmployeeNote(employeeId, input, roleKey);
    if (!note) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.status(201).json(note);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    if (err instanceof Error && err.message === "Note template not found") {
      res.status(404).json({ message: "Notizvorlage nicht gefunden" });
      return;
    }
    next(err);
  }
}

export async function deleteEmployeeNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const hasAccess = await employeeNotesService.assertEmployeeNoteMutationAccess(employeeId, roleKey);
    if (!hasAccess) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const noteId = Number(req.params.noteId);
    const input = api.employeeNotes.delete.input.parse(req.body);
    await notesService.deleteEmployeeScopedNote(employeeId, noteId, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    if (err instanceof notesService.NotesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
