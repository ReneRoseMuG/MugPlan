import type { InsertNoteTemplate, NoteTemplate, UpdateNoteTemplate } from "@shared/schema";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";

export async function listNoteTemplates(activeOnly = true): Promise<NoteTemplate[]> {
  return noteTemplatesRepository.getNoteTemplates(activeOnly);
}

export async function getNoteTemplate(id: number): Promise<NoteTemplate | null> {
  return noteTemplatesRepository.getNoteTemplate(id);
}

export async function createNoteTemplate(data: InsertNoteTemplate): Promise<NoteTemplate> {
  return noteTemplatesRepository.createNoteTemplate(data);
}

export async function updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null> {
  return noteTemplatesRepository.updateNoteTemplate(id, data);
}

export async function deleteNoteTemplate(id: number): Promise<void> {
  await noteTemplatesRepository.deleteNoteTemplate(id);
}
