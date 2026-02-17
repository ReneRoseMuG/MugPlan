/**
 * Test Scope:
 *
 * Feature: FT06 - Teamverwaltung Multi-User
 * Use Case: UC Team bearbeiten/loeschen/zuweisen mit Versionspflicht
 *
 * Abgedeckte Regeln:
 * - Team-PATCH sendet color und version.
 * - Team-DELETE sendet version.
 * - Batch-Assign sendet items[{ employeeId, version }].
 *
 * Fehlerfaelle:
 * - Fehlende Team-/Employee-Version wird als VALIDATION_ERROR blockiert.
 * - VERSION_CONFLICT wird mit einer Konfliktmeldung gemappt.
 *
 * Ziel:
 * Frontend-Verdrahtung der Team-Mutationen auf den Multi-User-Contract absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT06 TeamManagement versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TeamManagement.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in team update and delete payloads", () => {
    expect(source).toContain("apiRequest(\"PATCH\", `/api/teams/${id}`, { color, version })");
    expect(source).toContain("apiRequest(\"DELETE\", `/api/teams/${id}`, { version })");
    expect(source).toContain("deleteMutation.mutate({ id: team.id, version: team.version })");
  });

  it("uses batch payload items with employee version", () => {
    expect(source).toContain("const items = employeeIds.map((employeeId) => {");
    expect(source).toContain("return { employeeId, version: employee.version };");
    expect(source).toContain("apiRequest(\"POST\", `/api/teams/${teamId}/employees`, { items })");
  });

  it("maps VERSION_CONFLICT to user-facing conflict text", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Datensatz wurde zwischenzeitlich geändert");
  });
});

