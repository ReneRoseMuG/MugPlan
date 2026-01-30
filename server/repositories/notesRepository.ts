import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { customerNotes, notes, projectNotes, type Note, type InsertNote, type UpdateNote } from "@shared/schema";

export async function getCustomerNotes(customerId: number): Promise<Note[]> {
  const result = await db
    .select({ note: notes })
    .from(customerNotes)
    .innerJoin(notes, eq(customerNotes.noteId, notes.id))
    .where(eq(customerNotes.customerId, customerId))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  return result.map((row) => row.note);
}

export async function getProjectNotes(projectId: number): Promise<Note[]> {
  const result = await db
    .select({ note: notes })
    .from(projectNotes)
    .innerJoin(notes, eq(projectNotes.noteId, notes.id))
    .where(eq(projectNotes.projectId, projectId))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  return result.map((row) => row.note);
}

export async function createNote(data: InsertNote): Promise<Note> {
  const result = await db.insert(notes).values(data);
  const insertId = (result as any)[0].insertId;
  const [note] = await db.select().from(notes).where(eq(notes.id, insertId));
  return note;
}

export async function addCustomerNoteRelation(customerId: number, noteId: number): Promise<void> {
  await db.insert(customerNotes).values({ customerId, noteId });
}

export async function addProjectNoteRelation(projectId: number, noteId: number): Promise<void> {
  await db.insert(projectNotes).values({ projectId, noteId });
}

export async function updateNote(noteId: number, data: UpdateNote): Promise<Note | null> {
  await db
    .update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notes.id, noteId));
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  return note || null;
}

export async function toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null> {
  await db
    .update(notes)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(notes.id, noteId));
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  return note || null;
}

export async function deleteNote(noteId: number): Promise<void> {
  await db.delete(customerNotes).where(eq(customerNotes.noteId, noteId));
  await db.delete(projectNotes).where(eq(projectNotes.noteId, noteId));
  await db.delete(notes).where(eq(notes.id, noteId));
}

export async function deleteProjectNoteRelation(projectId: number, noteId: number): Promise<void> {
  await db.delete(projectNotes).where(and(eq(projectNotes.projectId, projectId), eq(projectNotes.noteId, noteId)));
}
