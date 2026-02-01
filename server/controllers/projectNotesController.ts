import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as projectNotesService from "../services/projectNotesService";
import * as notesService from "../services/notesService";
import { handleZodError } from "./validation";

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
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }
    res.status(201).json(note);
  } catch (err) {
    if (err instanceof Error && err.message === "Note template not found") {
      res.status(404).json({ message: "Notizvorlage nicht gefunden" });
      return;
    }
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteProjectNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    await notesService.deleteNote(noteId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
