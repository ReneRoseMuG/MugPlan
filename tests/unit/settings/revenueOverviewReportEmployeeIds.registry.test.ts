/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Registry-Definition aus server/settings/registry. Keine DB, App oder FS.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Reine Funktions- und Konfigurationsprüfung.
 *
 * Isolation:
 * - Keine (deterministische Funktionsauswertung).
 *
 * Abgedeckte Regeln:
 * - Das Setting für die Umsatz-Report-Mitarbeiterauswahl ist USER-scoped, type "json", Default leere Liste.
 * - Validierung akzeptiert nur Listen eindeutiger positiver Ganzzahlen.
 * - Der Schlüssel steht bewusst NICHT unter "reports.*" (Wächter reportSettings.persistenceRemoval bleibt grün).
 *
 * Fehlerfälle:
 * - Falscher Scope, falscher Typ oder fehlender Default.
 * - Validierung akzeptiert Duplikate, Null/negative Werte, Nicht-Arrays.
 * - Schlüssel landet versehentlich unter "reports.*".
 *
 * Ziel:
 * Regressionssicherer Nachweis, dass das neue USER-Setting korrekt und konfliktfrei registriert ist.
 */
import { describe, expect, it } from "vitest";

import { settingDefinitions, userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: revenueOverviewReportEmployeeIds", () => {
  const entry = userSettingsRegistry.revenueOverviewReportEmployeeIds;

  it("defines the correct key, USER scope and empty default", () => {
    expect(entry.key).toBe("revenueOverviewReport.employeeIds");
    expect(entry.allowedScopes).toEqual(["USER"]);
    expect(entry.type).toBe("json");
    expect(entry.defaultValue).toEqual([]);
  });

  it("accepts lists of unique positive integers", () => {
    expect(entry.validate([])).toBe(true);
    expect(entry.validate([1])).toBe(true);
    expect(entry.validate([3, 7, 12])).toBe(true);
  });

  it("rejects duplicates, non-positive, non-integer and non-array values", () => {
    expect(entry.validate([1, 1])).toBe(false);
    expect(entry.validate([0])).toBe(false);
    expect(entry.validate([-2])).toBe(false);
    expect(entry.validate([1.5])).toBe(false);
    expect(entry.validate("1,2")).toBe(false);
    expect(entry.validate(null)).toBe(false);
    expect(entry.validate({})).toBe(false);
    expect(entry.validate(undefined)).toBe(false);
  });

  it("is not exposed under the reports.* prefix (persistence-removal guard stays green)", () => {
    const reportPrefixedKeys = settingDefinitions
      .map((definition) => definition.key)
      .filter((key) => key.startsWith("reports."));

    expect(reportPrefixedKeys).toEqual(["reports.categoryLayout"]);
    expect(entry.key.startsWith("reports.")).toBe(false);
  });
});
