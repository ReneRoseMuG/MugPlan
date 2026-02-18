import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectNotesService from "../services/projectNotesService";
import * as notesService from "../services/notesService";

export async function listProjectNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const notes = await projectNotesService.listProjectNotes(projectId);
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

export async function createProjectNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const input = api.projectNotes.create.input.parse(req.body);
    const note = await projectNotesService.createProjectNote(projectId, input);
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
    if (err instanceof Error && err.message === "Note template not found") {
      res.status(404).json({ message: "Notizvorlage nicht gefunden" });
      return;
    }
    next(err);
  }
}

export async function deleteProjectNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projectNotes.delete.input.parse(req.body);
    const noteId = Number(req.params.noteId);
    await notesService.deleteNote(noteId, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof notesService.NotesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
