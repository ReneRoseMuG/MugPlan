import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as customerNotesService from "../services/customerNotesService";
import * as notesService from "../services/notesService";
import { handleZodError } from "./validation";

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
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.status(201).json(note);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteCustomerNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const noteId = Number(req.params.noteId);
    await notesService.deleteNote(noteId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
