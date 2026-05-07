import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectNotesService from "../services/projectNotesService";
import * as notesService from "../services/notesService";
import { buildNoteMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";

function canMutateProjectNotes(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

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
    if (!canMutateProjectNotes(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const projectId = Number(req.params.projectId);
    const input = api.projectNotes.create.input.parse(req.body);
    const note = await projectNotesService.createProjectNote(projectId, input);
    if (!note) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "note",
      recordId: note.id,
      op: "create",
      newValue: note,
      snapshot: note,
      actor: getRequestActor(req),
      triggerKey: "project.note.create",
      messageText: buildNoteMessage("erstellt", "project", null, note.title, projectId),
      contexts: [
        {
          tableName: "project",
          recordId: projectId,
          relationRole: "owner",
        },
      ],
    });
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
    if (!canMutateProjectNotes(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const input = api.projectNotes.delete.input.parse(req.body);
    const projectId = Number(req.params.projectId);
    const noteId = Number(req.params.noteId);
    const existingNote = await notesService.getNote(noteId);
    await notesService.deleteProjectScopedNote(projectId, noteId, input.version);
    if (existingNote) {
      await journalService.recordJournalEntry({
        tableName: "note",
        recordId: existingNote.id,
        op: "delete",
        oldValue: existingNote,
        snapshot: existingNote,
        actor: getRequestActor(req),
        triggerKey: "project.note.delete",
        messageText: buildNoteMessage("gelöscht", "project", null, existingNote.title, projectId),
        contexts: [
          {
            tableName: "project",
            recordId: projectId,
            relationRole: "owner",
          },
        ],
      });
    }
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
