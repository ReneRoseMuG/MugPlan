import type { Note, InsertNote } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";
import * as notesRepository from "../repositories/notesRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";

export async function listCustomerNotes(customerId: number): Promise<Note[] | null> {
  const customer = await customersRepository.getCustomer(customerId);
  if (!customer) return null;
  const notes = await notesRepository.getCustomerNotes(customerId);
  return notes;
}

export async function createCustomerNote(
  customerId: number,
  data: InsertNote & { templateId?: number },
): Promise<Note | null> {
  const customer = await customersRepository.getCustomer(customerId);
  if (!customer) return null;

  let noteData: InsertNote = { title: data.title, body: data.body };
  if (data.templateId) {
    const template = await noteTemplatesRepository.getNoteTemplate(data.templateId);
    if (template) {
      noteData = {
        title: template.title,
        body: template.body,
        color: template.color ?? undefined,
      };
    }
  }

  const note = await notesRepository.createNote(noteData);
  await notesRepository.addCustomerNoteRelation(customerId, note.id);
  return note;
}
