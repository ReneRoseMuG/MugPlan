import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as calendarWeekNotesService from "../services/calendarWeekNotesService";
import * as notesService from "../services/notesService";

export async function listCalendarWeekNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = parseWeekParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber } = params;
    const notes = await calendarWeekNotesService.listCalendarWeekNotes(yearNumber, weekNumber);
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

function parseWeekParams(req: Request, res: Response): { yearNumber: number; weekNumber: number } | null {
  const yearNumber = Number(req.params.yearNumber);
  const weekNumber = Number(req.params.weekNumber);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return { yearNumber, weekNumber };
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

    const params = parseWeekParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber } = params;
    const input = api.calendarWeekNotes.create.input.parse(req.body);
    const note = await calendarWeekNotesService.createCalendarWeekNote(yearNumber, weekNumber, input);
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
    const params = parseWeekParams(req, res);
    if (!params) return;
    const { yearNumber, weekNumber } = params;
    const noteId = Number(req.params.noteId);
    await notesService.deleteCalendarWeekScopedNote(yearNumber, weekNumber, noteId, input.version);
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
