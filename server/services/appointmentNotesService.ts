import type { CreateNoteInput, InsertNote, Note } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as notesRepository from "../repositories/notesRepository";

export async function listAppointmentNotes(appointmentId: number): Promise<Note[] | null> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  return notesRepository.getAppointmentNotes(appointmentId);
}

export async function createAppointmentNote(
  appointmentId: number,
  data: CreateNoteInput & { templateId?: number },
): Promise<Note | null> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;

  const noteData: InsertNote = { title: data.title, body: data.body };
  if (data.templateId) {
    const template = await noteTemplatesRepository.getNoteTemplate(data.templateId);
    if (!template) {
      throw new Error("Note template not found");
    }
    if (template.color) {
      noteData.color = template.color;
    }
  }

  return notesRepository.withNotesTransaction(async (tx) => {
    const noteId = await notesRepository.createNoteTx(tx, noteData);
    await notesRepository.addAppointmentNoteRelationTx(tx, appointmentId, noteId);
    const note = await notesRepository.getNoteTx(tx, noteId);
    if (!note) {
      throw new Error("NOTE_CREATE_READBACK_FAILED");
    }
    return note;
  });
}
