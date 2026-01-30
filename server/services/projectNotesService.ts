import type { InsertNote, Note } from "@shared/schema";
import * as notesRepository from "../repositories/notesRepository";
import * as projectsRepository from "../repositories/projectsRepository";

export async function listProjectNotes(projectId: number): Promise<Note[]> {
  return notesRepository.getProjectNotes(projectId);
}

export async function createProjectNote(projectId: number, data: InsertNote): Promise<Note | null> {
  const project = await projectsRepository.getProject(projectId);
  if (!project) return null;
  const note = await notesRepository.createNote(data);
  await notesRepository.addProjectNoteRelation(projectId, note.id);
  return note;
}
