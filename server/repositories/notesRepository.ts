import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { appointmentNotes, calendarWeekNotes, customerNotes, notes, projectNotes, type Note, type InsertNote, type UpdateNote } from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withNotesTransaction<T>(handler: (tx: DbTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => handler(tx));
}

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

export async function getAppointmentNotes(appointmentId: number): Promise<Note[]> {
  const result = await db
    .select({ note: notes })
    .from(appointmentNotes)
    .innerJoin(notes, eq(appointmentNotes.noteId, notes.id))
    .where(eq(appointmentNotes.appointmentId, appointmentId))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  return result.map((row) => row.note);
}

export async function createNote(data: InsertNote): Promise<Note> {
  const result = await db.insert(notes).values(data);
  const insertId = (result as any)[0].insertId;
  const [note] = await db.select().from(notes).where(eq(notes.id, insertId));
  return note;
}

export async function createNoteTx(tx: DbTx, data: InsertNote): Promise<number> {
  const result = await tx.insert(notes).values(data);
  return Number((result as any)?.[0]?.insertId ?? 0);
}

export async function getNote(noteId: number): Promise<Note | null> {
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  return note ?? null;
}

export async function getNoteTx(tx: DbTx, noteId: number): Promise<Note | null> {
  const [note] = await tx.select().from(notes).where(eq(notes.id, noteId));
  return note ?? null;
}

export async function addCustomerNoteRelation(customerId: number, noteId: number): Promise<void> {
  await db.insert(customerNotes).values({ customerId, noteId });
}

export async function addCustomerNoteRelationTx(tx: DbTx, customerId: number, noteId: number): Promise<void> {
  await tx.insert(customerNotes).values({ customerId, noteId });
}

export async function addProjectNoteRelation(projectId: number, noteId: number): Promise<void> {
  await db.insert(projectNotes).values({ projectId, noteId });
}

export async function addProjectNoteRelationTx(tx: DbTx, projectId: number, noteId: number): Promise<void> {
  await tx.insert(projectNotes).values({ projectId, noteId });
}

export async function addAppointmentNoteRelation(appointmentId: number, noteId: number): Promise<void> {
  await db.insert(appointmentNotes).values({ appointmentId, noteId });
}

export async function addAppointmentNoteRelationTx(tx: DbTx, appointmentId: number, noteId: number): Promise<void> {
  await tx.insert(appointmentNotes).values({ appointmentId, noteId });
}

export async function updateNoteWithVersion(
  noteId: number,
  expectedVersion: number,
  data: UpdateNote,
): Promise<{ kind: "updated"; note: Note } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update note
    set
      title = coalesce(${data.title ?? null}, title),
      body = coalesce(${data.body ?? null}, body),
      card_color = case
        when card_color_locked then card_color
        when ${data.cardColor === undefined} then card_color
        else ${data.cardColor ?? null}
      end,
      print = coalesce(${data.print ?? null}, print),
      updated_at = now(),
      version = version + 1
    where id = ${noteId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  return { kind: "updated", note };
}

export async function toggleNotePinWithVersion(
  noteId: number,
  expectedVersion: number,
  isPinned: boolean,
): Promise<{ kind: "updated"; note: Note } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update note
    set
      is_pinned = ${isPinned},
      updated_at = now(),
      version = version + 1
    where id = ${noteId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  return { kind: "updated", note };
}

export async function getCalendarWeekNotes(
  yearNumber: number,
  weekNumber: number,
): Promise<Note[]> {
  const result = await db
    .select({ note: notes })
    .from(calendarWeekNotes)
    .innerJoin(notes, eq(calendarWeekNotes.noteId, notes.id))
    .where(sql`${calendarWeekNotes.yearNumber} = ${yearNumber} AND ${calendarWeekNotes.weekNumber} = ${weekNumber}`)
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  return result.map((row) => row.note);
}

export async function addCalendarWeekNoteRelationTx(
  tx: DbTx,
  noteId: number,
  yearNumber: number,
  weekNumber: number,
): Promise<void> {
  await tx.insert(calendarWeekNotes).values({ noteId, yearNumber, weekNumber });
}

export async function deleteCalendarWeekScopedNoteWithVersion(
  yearNumber: number,
  weekNumber: number,
  noteId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "not_found" }> {
  return db.transaction(async (tx) => {
    const relationResult = await tx
      .delete(calendarWeekNotes)
      .where(sql`${calendarWeekNotes.yearNumber} = ${yearNumber} AND ${calendarWeekNotes.weekNumber} = ${weekNumber} AND ${calendarWeekNotes.noteId} = ${noteId}`);
    const relationAffectedRows = Number((relationResult as any)?.[0]?.affectedRows ?? (relationResult as any)?.affectedRows ?? 0);
    if (relationAffectedRows === 0) {
      throw new Error("NOT_FOUND");
    }

    const result = await tx.execute(sql`
      delete from note
      where id = ${noteId}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { kind: "not_found" as const };
    }
    throw error;
  });
}

export async function deleteNoteWithVersion(
  noteId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  return db.transaction(async (tx) => {
    await tx.delete(customerNotes).where(eq(customerNotes.noteId, noteId));
    await tx.delete(projectNotes).where(eq(projectNotes.noteId, noteId));
    await tx.delete(appointmentNotes).where(eq(appointmentNotes.noteId, noteId));
    await tx.delete(calendarWeekNotes).where(eq(calendarWeekNotes.noteId, noteId));
    const result = await tx.execute(sql`
      delete from note
      where id = ${noteId}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    throw error;
  });
}

export async function deleteCustomerScopedNoteWithVersion(
  customerId: number,
  noteId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "not_found" }> {
  return db.transaction(async (tx) => {
    const relationResult = await tx
      .delete(customerNotes)
      .where(sql`${customerNotes.customerId} = ${customerId} and ${customerNotes.noteId} = ${noteId}`);
    const relationAffectedRows = Number((relationResult as any)?.[0]?.affectedRows ?? (relationResult as any)?.affectedRows ?? 0);
    if (relationAffectedRows === 0) {
      throw new Error("NOT_FOUND");
    }

    await tx.delete(projectNotes).where(eq(projectNotes.noteId, noteId));
    const result = await tx.execute(sql`
      delete from note
      where id = ${noteId}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { kind: "not_found" as const };
    }
    throw error;
  });
}

export async function deleteProjectScopedNoteWithVersion(
  projectId: number,
  noteId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "not_found" }> {
  return db.transaction(async (tx) => {
    const relationResult = await tx
      .delete(projectNotes)
      .where(sql`${projectNotes.projectId} = ${projectId} and ${projectNotes.noteId} = ${noteId}`);
    const relationAffectedRows = Number((relationResult as any)?.[0]?.affectedRows ?? (relationResult as any)?.affectedRows ?? 0);
    if (relationAffectedRows === 0) {
      throw new Error("NOT_FOUND");
    }

    await tx.delete(customerNotes).where(eq(customerNotes.noteId, noteId));
    const result = await tx.execute(sql`
      delete from note
      where id = ${noteId}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { kind: "not_found" as const };
    }
    throw error;
  });
}

export async function deleteAppointmentScopedNoteWithVersion(
  appointmentId: number,
  noteId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "not_found" }> {
  return db.transaction(async (tx) => {
    const [relation] = await tx
      .select({ noteId: appointmentNotes.noteId })
      .from(appointmentNotes)
      .where(sql`${appointmentNotes.appointmentId} = ${appointmentId} and ${appointmentNotes.noteId} = ${noteId}`)
      .limit(1);
    if (!relation) {
      throw new Error("NOT_FOUND");
    }

    const noteResult = await tx.execute(sql`
      update note
      set
        updated_at = now(),
        version = version + 1
      where id = ${noteId}
        and version = ${expectedVersion}
    `);
    const noteAffectedRows = Number((noteResult as any)?.[0]?.affectedRows ?? (noteResult as any)?.affectedRows ?? 0);
    if (noteAffectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }

    await tx
      .delete(appointmentNotes)
      .where(sql`${appointmentNotes.appointmentId} = ${appointmentId} and ${appointmentNotes.noteId} = ${noteId}`);

    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { kind: "not_found" as const };
    }
    throw error;
  });
}
