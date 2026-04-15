import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as notesService from "../services/notesService";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";

export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    const input = api.notes.update.input.parse(req.body);
    const previousNote = await notesService.getNote(noteId);
    const note = await notesService.updateNote(noteId, input);
    if (!note) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (previousNote) {
      const contexts = await journalService.listNoteContexts(noteId);
      await journalService.recordJournalEntry({
        tableName: "note",
        recordId: note.id,
        op: "update",
        oldValue: previousNote,
        newValue: note,
        snapshot: note,
        actor: getRequestActor(req),
        triggerKey: "note.update",
        messageText: `Notiz ${note.title} geaendert`,
        contexts,
      });
    }
    res.json(note);
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

export async function toggleNotePin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    const input = api.notes.togglePin.input.parse(req.body);
    const previousNote = await notesService.getNote(noteId);
    const note = await notesService.toggleNotePin(noteId, input.isPinned, input.version);
    if (!note) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (previousNote) {
      const contexts = await journalService.listNoteContexts(noteId);
      await journalService.recordJournalEntry({
        tableName: "note",
        recordId: note.id,
        op: input.isPinned ? "pin" : "unpin",
        field: "isPinned",
        oldValue: previousNote,
        newValue: note,
        snapshot: note,
        actor: getRequestActor(req),
        triggerKey: input.isPinned ? "note.pin" : "note.unpin",
        messageText: `Notiz ${note.title} ${input.isPinned ? "angepinnt" : "entpinnt"}`,
        contexts,
      });
    }
    res.json(note);
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
