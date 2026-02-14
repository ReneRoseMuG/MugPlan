import type { InsertNoteTemplate, NoteTemplate, UpdateNoteTemplate } from "@shared/schema";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";

export class NoteTemplatesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listNoteTemplates(activeOnly = true): Promise<NoteTemplate[]> {
  return noteTemplatesRepository.getNoteTemplates(activeOnly);
}

export async function getNoteTemplate(id: number): Promise<NoteTemplate | null> {
  return noteTemplatesRepository.getNoteTemplate(id);
}

export async function createNoteTemplate(data: InsertNoteTemplate): Promise<NoteTemplate> {
  return noteTemplatesRepository.createNoteTemplate(data);
}

export async function updateNoteTemplate(
  id: number,
  data: UpdateNoteTemplate & { version: number },
): Promise<NoteTemplate | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new NoteTemplatesError(422, "VALIDATION_ERROR");
  }
  const result = await noteTemplatesRepository.updateNoteTemplateWithVersion(id, data.version, data);
  if (result.kind === "version_conflict") {
    const exists = await noteTemplatesRepository.getNoteTemplate(id);
    if (!exists) return null;
    throw new NoteTemplatesError(409, "VERSION_CONFLICT");
  }
  return result.template;
}

export async function deleteNoteTemplate(id: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new NoteTemplatesError(422, "VALIDATION_ERROR");
  }
  const result = await noteTemplatesRepository.deleteNoteTemplateWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await noteTemplatesRepository.getNoteTemplate(id);
    if (!exists) {
      throw new NoteTemplatesError(404, "NOT_FOUND");
    }
    throw new NoteTemplatesError(409, "VERSION_CONFLICT");
  }
}
