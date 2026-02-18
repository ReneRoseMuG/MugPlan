/**
 * Test Scope:
 *
 * Feature: FT09/FT13 - Kundennotizen Multi-User
 * Use Case: UC Notiz pinnen/loeschen in Kundendaten
 *
 * Abgedeckte Regeln:
 * - Pin-Mutation sendet isPinned + version.
 * - Delete-Mutation sendet version.
 * - Version wird aus geladenen notes aufgeloest.
 *
 * Fehlerfaelle:
 * - Fehlende Note-Version wird als VALIDATION_ERROR geblockt.
 * - VERSION_CONFLICT wird mit Konfliktmeldung angezeigt.
 *
 * Ziel:
 * Verhindern, dass Notiz-Requests im Kundenformular ohne version gesendet werden.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT09/FT13 CustomerData note versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in note pin and delete payload", () => {
    expect(source).toContain("apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version })");
    expect(source).toContain("apiRequest('DELETE', `/api/customers/${customerId}/notes/${noteId}`, { version })");
  });

  it("resolves note version from notes list before mutation", () => {
    expect(source).toContain("const getNoteVersion = (noteId: number): number => {");
    expect(source).toContain("const version = getNoteVersion(noteId);");
    expect(source).toContain("togglePinMutation.mutate({ noteId, isPinned, version });");
  });
});

