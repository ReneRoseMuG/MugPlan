import { eq, sql } from "drizzle-orm";
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

export async function updateNoteTemplateWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateNoteTemplate,
): Promise<{ kind: "updated"; template: NoteTemplate } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update note_template
    set
      title = coalesce(${data.title ?? null}, title),
      body = coalesce(${data.body ?? null}, body),
      color = ${data.color ?? null},
      sort_order = coalesce(${data.sortOrder ?? null}, sort_order),
      is_active = coalesce(${data.isActive ?? null}, is_active),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
  return { kind: "updated", template };
}

export async function deleteNoteTemplateWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from note_template
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}
