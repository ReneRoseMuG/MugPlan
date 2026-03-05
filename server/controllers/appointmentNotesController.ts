import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentNotesService from "../services/appointmentNotesService";
import * as notesService from "../services/notesService";

export async function listAppointmentNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const notes = await appointmentNotesService.listAppointmentNotes(appointmentId);
    if (!notes) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

export async function createAppointmentNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const input = api.appointmentNotes.create.input.parse(req.body);
    const note = await appointmentNotesService.createAppointmentNote(appointmentId, input);
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

export async function deleteAppointmentNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointmentNotes.delete.input.parse(req.body);
    const appointmentId = Number(req.params.appointmentId);
    const noteId = Number(req.params.noteId);
    await notesService.deleteAppointmentScopedNote(appointmentId, noteId, input.version);
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
