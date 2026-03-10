import type { CreateNoteInput, InsertNote, Note } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as projectsRepository from "../repositories/projectsRepository";

export async function listProjectNotes(projectId: number): Promise<Note[]> {
  return notesRepository.getProjectNotes(projectId);
}

export async function createProjectNote(
  projectId: number,
  data: CreateNoteInput & { templateId?: number },
): Promise<Note | null> {
  const project = await projectsRepository.getProject(projectId);
  if (!project) return null;

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
    await notesRepository.addProjectNoteRelationTx(tx, projectId, noteId);
    const note = await notesRepository.getNoteTx(tx, noteId);
    if (!note) {
      throw new Error("NOTE_CREATE_READBACK_FAILED");
    }
    return note;
  });
}
