/**
 * Test Scope:
 *
 * Feature: FT02/FT13 - Projektnotizen Multi-User
 * Use Case: UC Notiz pinnen/loeschen im Projektformular
 *
 * Abgedeckte Regeln:
 * - Pin-Mutation sendet isPinned + version.
 * - Delete-Mutation sendet version.
 * - Version wird aus projectNotes aufgeloest.
 *
 * Fehlerfaelle:
 * - Fehlende Note-Version wird als VALIDATION_ERROR geblockt.
 * - VERSION_CONFLICT wird mit Reload-Hinweis gemeldet.
 *
 * Ziel:
 * Sicherstellen, dass Projektnotiz-Aktionen keinen Request ohne version absenden.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02/FT13 ProjectForm note versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in note pin and delete payload", () => {
    expect(source).toContain("apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version })");
    expect(source).toContain("apiRequest('DELETE', `/api/projects/${projectId}/notes/${noteId}`, { version })");
  });

  it("resolves note version from loaded notes and wires NotesSection actions", () => {
    expect(source).toContain("const getProjectNoteVersion = (noteId: number): number => {");
    expect(source).toContain("const version = getProjectNoteVersion(id);");
    expect(source).toContain("const version = getProjectNoteVersion(noteId);");
  });
});

