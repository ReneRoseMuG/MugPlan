import type { CreateNoteInput, Note, InsertNote } from "@shared/schema";
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
  data: CreateNoteInput & { templateId?: number },
): Promise<Note | null> {
  const customer = await customersRepository.getCustomer(customerId);
  if (!customer) return null;

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
    await notesRepository.addCustomerNoteRelationTx(tx, customerId, noteId);
    const note = await notesRepository.getNote(noteId);
    return note;
  });
}
