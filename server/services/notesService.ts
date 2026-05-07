import type { Note, UpdateNote } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";
import * as appointmentsService from "./appointmentsService";

export class NotesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "ABSENCE_APPOINTMENT_READONLY" | "PAST_APPOINTMENT_READONLY";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "ABSENCE_APPOINTMENT_READONLY" | "PAST_APPOINTMENT_READONLY") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function getNote(noteId: number): Promise<Note | null> {
  return notesRepository.getNote(noteId);
}

async function assertNoteMutationAllowed(noteId: number): Promise<void> {
  const appointmentId = await notesRepository.getAppointmentIdByNoteId(noteId);
  if (appointmentId == null) {
    return;
  }
  const readOnlyCode = await appointmentsService.getAppointmentNoteMutationReadOnlyCode(appointmentId);
  if (readOnlyCode) {
    throw new NotesError(409, readOnlyCode);
  }
}

export async function updateNote(noteId: number, data: UpdateNote & { version: number }): Promise<Note | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  await assertNoteMutationAllowed(noteId);
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
  await assertNoteMutationAllowed(noteId);
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
  await assertNoteMutationAllowed(noteId);
  const result = await notesRepository.deleteNoteWithVersion(noteId, version);
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}

export async function deleteCustomerScopedNote(customerId: number, noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.deleteCustomerScopedNoteWithVersion(customerId, noteId, version);
  if (result.kind === "not_found") {
    throw new NotesError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}

export async function deleteProjectScopedNote(projectId: number, noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.deleteProjectScopedNoteWithVersion(projectId, noteId, version);
  if (result.kind === "not_found") {
    throw new NotesError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}

export async function deleteCalendarWeekScopedNote(yearNumber: number, weekNumber: number, tourId: number | null, noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.deleteCalendarWeekScopedNoteWithVersion(yearNumber, weekNumber, tourId, noteId, version);
  if (result.kind === "not_found") {
    throw new NotesError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}

export async function deleteAppointmentScopedNote(appointmentId: number, noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const readOnlyCode = await appointmentsService.getAppointmentNoteMutationReadOnlyCode(appointmentId);
  if (readOnlyCode) {
    throw new NotesError(409, readOnlyCode);
  }
  const result = await notesRepository.deleteAppointmentScopedNoteWithVersion(appointmentId, noteId, version);
  if (result.kind === "not_found") {
    throw new NotesError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}

export async function deleteEmployeeScopedNote(employeeId: number, noteId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NotesError(422, "VALIDATION_ERROR");
  }
  const result = await notesRepository.deleteEmployeeScopedNoteWithVersion(employeeId, noteId, version);
  if (result.kind === "not_found") {
    throw new NotesError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    const exists = await notesRepository.getNote(noteId);
    if (!exists) {
      throw new NotesError(404, "NOT_FOUND");
    }
    throw new NotesError(409, "VERSION_CONFLICT");
  }
}
