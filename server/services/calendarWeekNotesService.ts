import type { CreateNoteInput, InsertNote, Note } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";

export async function listCalendarWeekNotes(
  yearNumber: number,
  weekNumber: number,
): Promise<Note[]> {
  return notesRepository.getCalendarWeekNotes(yearNumber, weekNumber);
}

export async function createCalendarWeekNote(
  yearNumber: number,
  weekNumber: number,
  data: CreateNoteInput & { templateId?: number },
): Promise<Note> {
  const noteData: InsertNote = {
    title: data.title,
    body: data.body,
    cardColor: data.cardColor ?? null,
    print: data.print,
  };
  if (data.templateId) {
    const template = await noteTemplatesRepository.getNoteTemplate(data.templateId);
    if (!template) {
      throw new Error("Note template not found");
    }
    noteData.cardColor = template.cardColor ?? null;
    noteData.print = template.print;
    noteData.cardColorLocked = template.cardColor !== null;
  }

  return notesRepository.withNotesTransaction(async (tx) => {
    const noteId = await notesRepository.createNoteTx(tx, noteData);
    await notesRepository.addCalendarWeekNoteRelationTx(tx, noteId, yearNumber, weekNumber);
    const note = await notesRepository.getNoteTx(tx, noteId);
    if (!note) {
      throw new Error("NOTE_CREATE_READBACK_FAILED");
    }
    return note;
  });
}
