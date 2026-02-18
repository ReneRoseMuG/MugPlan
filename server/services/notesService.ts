import type { Note, UpdateNote } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";

export class NotesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function updateNote(noteId: number, data: UpdateNote & { version: number }): Promise<Note | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.updateNoteWithVersion(noteId, data.version, data);
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) return null;
    throw new NotesError(409, "VERSION_CONFLICT");
  }
  return result.note;
}

export async function toggleNotePin(
  noteId: number,
  isPinned: boolean,
  version: number,
): Promise<Note | null> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.toggleNotePinWithVersion(noteId, version, isPinned);
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) return null;
    throw new NotesError(409, "VERSION_CONFLICT");
  }
  return result.note;
}

export async function deleteNote(noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.deleteNoteWithVersion(noteId, version);
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}
