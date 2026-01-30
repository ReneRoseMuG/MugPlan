import { eq } from "drizzle-orm";
import { db } from "../db";
import { noteTemplates, type NoteTemplate, type InsertNoteTemplate, type UpdateNoteTemplate } from "@shared/schema";

export async function getNoteTemplates(activeOnly = true): Promise<NoteTemplate[]> {
  if (activeOnly) {
    return db
      .select()
      .from(noteTemplates)
      .where(eq(noteTemplates.isActive, true))
      .orderBy(noteTemplates.sortOrder, noteTemplates.title);
  }
  return db.select().from(noteTemplates).orderBy(noteTemplates.sortOrder, noteTemplates.title);
}

export async function getNoteTemplate(id: number): Promise<NoteTemplate | null> {
  const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
  return template || null;
}

export async function createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate> {
  const result = await db.insert(noteTemplates).values(template);
  const insertId = (result as any)[0].insertId;
  const [created] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, insertId));
  return created;
}

export async function updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null> {
  await db
    .update(noteTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(noteTemplates.id, id));
  const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
  return template || null;
}

export async function deleteNoteTemplate(id: number): Promise<void> {
  await db.delete(noteTemplates).where(eq(noteTemplates.id, id));
}
