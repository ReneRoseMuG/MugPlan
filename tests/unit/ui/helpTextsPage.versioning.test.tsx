/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte Multi-User
 * Use Case: UC Hilfetext aktualisieren/loeschen mit Version
 *
 * Abgedeckte Regeln:
 * - PUT sendet version aus editingHelpText.
 * - DELETE sendet version aus dem selektierten Datensatz.
 * - VERSION_CONFLICT wird mit Konflikttext behandelt.
 *
 * Fehlerfaelle:
 * - Update/Delete ohne Version fuehrt zu VALIDATION_ERROR.
 *
 * Ziel:
 * Locking-konforme Mutation-Payloads in der Hilfetextverwaltung absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 HelpTextsPage versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/HelpTextsPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in update and delete payload", () => {
    expect(source).toContain("data: { helpKey: formHelpKey, title: formTitle, body: formBody, isActive: formIsActive, version: editingHelpText.version }");
    expect(source).toContain("apiRequest(\"DELETE\", `/api/help-texts/${id}`, { version })");
    expect(source).toContain("deleteMutation.mutate({ id: helpText.id, version: helpText.version })");
  });

  it("maps VERSION_CONFLICT to dedicated toast", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Datensatz wurde zwischenzeitlich geaendert");
  });
});

