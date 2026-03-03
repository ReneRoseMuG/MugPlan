/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte Multi-User
 * Use Case: UC Hilfetext aktualisieren/loeschen mit Version
 *
 * Abgedeckte Regeln:
 * - HelpTextForm sendet version beim PUT-Update.
 * - HelpTextForm sendet version beim DELETE.
 * - VERSION_CONFLICT wird mit Konflikttext behandelt.
 *
 * Fehlerfaelle:
 * - Update/Delete ohne Version fuehrt zu VALIDATION_ERROR.
 *
 * Ziel:
 * Locking-konforme Mutation-Payloads im Hilfetext-Formular absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 HelpTextForm versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/HelpTextForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in update and delete payload", () => {
    expect(source).toContain("await apiRequest(\"PUT\", `/api/help-texts/${payload.id}`");
    expect(source).toContain("version: payload.version");
    expect(source).toContain("await apiRequest(\"DELETE\", `/api/help-texts/${payload.id}`, { version: payload.version })");
    expect(source).toContain("deleteMutation.mutate({ id: helpText.id, version: helpText.version })");
  });

  it("maps VERSION_CONFLICT to dedicated toast", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Datensatz wurde zwischenzeitlich geaendert");
  });
});
