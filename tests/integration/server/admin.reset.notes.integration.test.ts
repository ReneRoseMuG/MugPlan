/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin-Reset leert die Tabellen fuer Notizen und Notizvorlagen vollstaendig.
 * - Reset meldet die geloeschten Notizen und Vorlagen in der Rueckgabe.
 *
 * Fehlerfaelle:
 * - Reset laesst Notiz- oder Vorlagenreste im Datenbestand zurueck.
 * - Reset-Rueckgabe unterschlaegt geloeschte Eintraege fuer note/note_template.
 *
 * Ziel:
 * Nachweisen, dass der zentrale Reset-Pfad Notizen und Notizvorlagen explizit entfernt.
 */
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { resetDatabase } from "../../../server/services/adminService";
import * as noteTemplatesRepository from "../../../server/repositories/noteTemplatesRepository";
import * as notesRepository from "../../../server/repositories/notesRepository";
import { noteTemplates, notes } from "../../../shared/schema";

describe("PKG-02 integration: admin reset clears seeded notes and note templates", () => {
  it("empties note and note_template tables and reports deleted counts", async () => {
    const template = await noteTemplatesRepository.createNoteTemplate({
      title: "Reset Seed Vorlage",
      body: "Reset Seed Body",
      color: "#0f766e",
      sortOrder: 1,
      isActive: true,
    });
    const note = await notesRepository.createNote({
      title: "Reset Seed Notiz",
      body: "Reset Seed Hinweis",
      color: "#1d4ed8",
    });

    const [templateBeforeRow] = await notesRepository.withNotesTransaction(async (tx) =>
      tx.select({ count: sql<number>`count(*)` }).from(noteTemplates).where(eq(noteTemplates.id, template.id)),
    );
    const [noteBeforeRow] = await notesRepository.withNotesTransaction(async (tx) =>
      tx.select({ count: sql<number>`count(*)` }).from(notes).where(eq(notes.id, note.id)),
    );
    expect(Number(templateBeforeRow?.count ?? 0)).toBe(1);
    expect(Number(noteBeforeRow?.count ?? 0)).toBe(1);

    const result = await resetDatabase();

    expect(result.deleted.noteTemplates).toBeGreaterThanOrEqual(1);
    expect(result.deleted.notes).toBeGreaterThanOrEqual(1);

    const [templateAfterRow] = await notesRepository.withNotesTransaction(async (tx) =>
      tx.select({ count: sql<number>`count(*)` }).from(noteTemplates),
    );
    const [noteAfterRow] = await notesRepository.withNotesTransaction(async (tx) =>
      tx.select({ count: sql<number>`count(*)` }).from(notes),
    );
    expect(Number(templateAfterRow?.count ?? 0)).toBe(0);
    expect(Number(noteAfterRow?.count ?? 0)).toBe(0);
  });
});
