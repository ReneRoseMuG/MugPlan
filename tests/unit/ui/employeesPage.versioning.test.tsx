/**
 * Test Scope:
 *
 * Feature: FT05+ - Mitarbeiter Locking im Frontend
 * Use Case: UC Mitarbeiter speichern und aktiv/deaktivieren
 *
 * Abgedeckte Regeln:
 * - PUT auf Mitarbeiter sendet verpflichtend die Version.
 * - PATCH toggleActive sendet verpflichtend die Version.
 * - VERSION_CONFLICT und FORBIDDEN werden codebasiert gemappt.
 *
 * Fehlerfaelle:
 * - Toggle ohne Version fuehrt zu VALIDATION_ERROR/VERSION_CONFLICT.
 * - Rollenfehler ohne FORBIDDEN-Mapping sind fuer Nutzer nicht eindeutig.
 *
 * Ziel:
 * Sicherstellen, dass EmployeesPage die Multi-User-Locking- und Rechtevertraege einhaelt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ employees page versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version for employee update", () => {
    expect(source).toContain("data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null; version: number }");
    expect(source).toContain("return apiRequest(\"PUT\", `/api/employees/${id}`, data);");
    expect(source).toContain("const resolvedVersion = version as number;");
    expect(source).toContain("version: resolvedVersion,");
  });

  it("sends version for toggle active endpoint", () => {
    expect(source).toContain("mutationFn: async ({ id, isActive, version }: { id: number; isActive: boolean; version: number }) => {");
    expect(source).toContain("apiRequest(\"PATCH\", `/api/employees/${id}/active`, { isActive, version })");
    expect(source).toContain("toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive, version: employee.version });");
  });

  it("maps VERSION_CONFLICT and FORBIDDEN to dedicated toasts", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("if (code === \"FORBIDDEN\")");
    expect(source).toContain("zwischenzeitlich geaendert");
    expect(source).toContain("Nur Admin darf den Aktiv-Status aendern.");
  });
});
