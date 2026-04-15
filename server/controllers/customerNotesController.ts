import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as customerNotesService from "../services/customerNotesService";
import * as notesService from "../services/notesService";
import { buildNoteMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";

export async function listCustomerNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.customerId);
    const notes = await customerNotesService.listCustomerNotes(customerId);
    if (!notes) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

export async function createCustomerNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.customerId);
    const input = api.customerNotes.create.input.parse(req.body);
    const note = await customerNotesService.createCustomerNote(customerId, input);
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
      triggerKey: "customer.note.create",
      messageText: buildNoteMessage("erstellt", "customer", null, note.title, customerId),
      contexts: [
        {
          tableName: "customer",
          recordId: customerId,
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

export async function deleteCustomerNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customerNotes.delete.input.parse(req.body);
    const customerId = Number(req.params.customerId);
    const noteId = Number(req.params.noteId);
    const existingNote = await notesService.getNote(noteId);
    await notesService.deleteCustomerScopedNote(customerId, noteId, input.version);
    if (existingNote) {
      await journalService.recordJournalEntry({
        tableName: "note",
        recordId: existingNote.id,
        op: "delete",
        oldValue: existingNote,
        snapshot: existingNote,
        actor: getRequestActor(req),
        triggerKey: "customer.note.delete",
        messageText: buildNoteMessage("geloescht", "customer", null, existingNote.title, customerId),
        contexts: [
          {
            tableName: "customer",
            recordId: customerId,
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
