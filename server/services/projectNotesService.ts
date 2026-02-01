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

  const note = await notesRepository.createNote(noteData);
  await notesRepository.addProjectNoteRelation(projectId, note.id);
  return note;
}
