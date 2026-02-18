import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as customerNotesService from "../services/customerNotesService";
import * as notesService from "../services/notesService";

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
