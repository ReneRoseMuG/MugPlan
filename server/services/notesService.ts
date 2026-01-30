import type { Note, UpdateNote } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";

export async function updateNote(noteId: number, data: UpdateNote): Promise<Note | null> {
  return notesRepository.updateNote(noteId, data);
}

export async function toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null> {
  return notesRepository.toggleNotePin(noteId, isPinned);
}

export async function deleteNote(noteId: number): Promise<void> {
  await notesRepository.deleteNote(noteId);
}
