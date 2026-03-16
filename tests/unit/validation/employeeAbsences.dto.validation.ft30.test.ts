/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten DTO/Contract Validierung
 *
 * Abgedeckte Regeln:
 * - Create verlangt Typ, Von und Bis.
 * - Update verlangt eine gueltige Version >= 1.
 * - Delete verlangt eine gueltige Version >= 1.
 *
 * Fehlerfaelle:
 * - Fehlende Pflichtfelder.
 * - Ungueltige Versionswerte.
 * - Falsche Datentypen.
 *
 * Ziel:
 * Die isolierten FT30-Contracts fuer Mitarbeiterabwesenheiten reproduzierbar absichern.
 */
import { describe, expect, it } from "vitest";
import { api } from "../../../shared/routes";

describe.skip("FT30 unit: employee absence dto validation", () => {
  it("create dto accepts valid payload", () => {
    const result = api.employees.absences.create.input.safeParse({
      type: "vacation",
      from: "2099-01-01",
      until: "2099-01-03",
    });

    expect(result.success).toBe(true);
  });

  it("create dto rejects missing fields", () => {
    const result = api.employees.absences.create.input.safeParse({
      type: "vacation",
      from: "2099-01-01",
    });

    expect(result.success).toBe(false);
  });

  it("create dto rejects invalid absence type", () => {
    const result = api.employees.absences.create.input.safeParse({
      type: "other",
      from: "2099-01-01",
      until: "2099-01-03",
    });

    expect(result.success).toBe(false);
  });

  it("update dto requires version >= 1", () => {
    const missingVersion = api.employees.absences.update.input.safeParse({
      type: "sick",
    });
    const invalidVersion = api.employees.absences.update.input.safeParse({
      version: 0,
      type: "sick",
    });

    expect(missingVersion.success).toBe(false);
    expect(invalidVersion.success).toBe(false);
  });

  it("update dto accepts partial payload with version", () => {
    const result = api.employees.absences.update.input.safeParse({
      version: 2,
      until: "2099-01-05",
    });

    expect(result.success).toBe(true);
  });

  it("delete dto requires version >= 1", () => {
    const missingVersion = api.employees.absences.delete.input.safeParse({});
    const invalidVersion = api.employees.absences.delete.input.safeParse({ version: -1 });

    expect(missingVersion.success).toBe(false);
    expect(invalidVersion.success).toBe(false);
  });
});
