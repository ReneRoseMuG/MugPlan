import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as calendarWeekNotesService from "../services/calendarWeekNotesService";
import * as notesService from "../services/notesService";
import { buildCalendarWeekMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";

export async function listCalendarWeekNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = parseWeekTourParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber, tourId } = params;
    const notes = await calendarWeekNotesService.listCalendarWeekNotes(yearNumber, weekNumber, tourId);
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

function parseWeekTourParams(req: Request, res: Response): { yearNumber: number; weekNumber: number; tourId: number | null } | null {
  const yearNumber = Number(req.params.yearNumber);
  const weekNumber = Number(req.params.weekNumber);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  const tourIdRaw = req.params.tourId;
  const tourId = tourIdRaw === "0" ? null : Number(tourIdRaw);
  if (tourIdRaw !== "0" && (!Number.isInteger(tourId) || tourId! <= 0)) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return { yearNumber, weekNumber, tourId };
}

export async function createCalendarWeekNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey === "LESER") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const params = parseWeekTourParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber, tourId } = params;
    const input = api.calendarWeekNotes.create.input.parse(req.body);
    const note = await calendarWeekNotesService.createCalendarWeekNote(yearNumber, weekNumber, tourId, input);
    await journalService.recordJournalEntry({
      tableName: "note",
      recordId: note.id,
      op: "create",
      newValue: note,
      snapshot: note,
      actor: getRequestActor(req),
      triggerKey: "calendar_week.note.create",
      messageText: buildCalendarWeekMessage("notiz_erstellt", yearNumber, weekNumber, null),
      contexts: [journalService.buildCalendarWeekContext({ yearNumber, weekNumber, tourId })],
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

export async function deleteCalendarWeekNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey === "LESER") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const input = api.calendarWeekNotes.delete.input.parse(req.body);
    const params = parseWeekTourParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber, tourId } = params;
    const noteId = Number(req.params.noteId);
    const existingNote = await notesService.getNote(noteId);
    await notesService.deleteCalendarWeekScopedNote(yearNumber, weekNumber, tourId, noteId, input.version);
    if (existingNote) {
      await journalService.recordJournalEntry({
        tableName: "note",
        recordId: existingNote.id,
        op: "delete",
        oldValue: existingNote,
        snapshot: existingNote,
        actor: getRequestActor(req),
        triggerKey: "calendar_week.note.delete",
        messageText: buildCalendarWeekMessage("notiz_geloescht", yearNumber, weekNumber, null),
        contexts: [journalService.buildCalendarWeekContext({ yearNumber, weekNumber, tourId })],
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
