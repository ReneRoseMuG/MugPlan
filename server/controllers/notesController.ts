import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as notesService from "../services/notesService";
import { handleZodError } from "./validation";

export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    const input = api.notes.update.input.parse(req.body);
    const note = await notesService.updateNote(noteId, input);
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }
    res.json(note);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function toggleNotePin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    const input = api.notes.togglePin.input.parse(req.body);
    const note = await notesService.toggleNotePin(noteId, input.isPinned);
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }
    res.json(note);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}
