/**
 * Test Scope:
 *
 * Feature: FT13 - Notizvorlagen Multi-User
 * Use Case: UC Vorlage aktualisieren/loeschen mit Version
 *
 * Abgedeckte Regeln:
 * - PUT sendet version aus editingTemplate.
 * - DELETE sendet version aus dem selektierten Template.
 * - VERSION_CONFLICT wird konfliktbezogen angezeigt.
 *
 * Fehlerfaelle:
 * - Update/Delete ohne version fuehrt zu Locking-Fehlern.
 *
 * Ziel:
 * Payload- und Konfliktverdrahtung fuer Notizvorlagen absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT13 NoteTemplatesPage versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/NoteTemplatesPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in update and delete payload", () => {
    expect(source).toContain("data: { ...payload, version: editingTemplate.version }");
    expect(source).toContain("apiRequest(\"DELETE\", `/api/note-templates/${id}`, { version })");
    expect(source).toContain("deleteMutation.mutate({ id: template.id, version: template.version })");
  });

  it("maps VERSION_CONFLICT to dedicated toast", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Datensatz wurde zwischenzeitlich geaendert");
  });
});

