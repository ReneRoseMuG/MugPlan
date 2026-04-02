/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der User-Setting-Key für die Vorlaufliste speichert die neue Spaltenkonfiguration benutzerspezifisch.
 * - columnOrder, hiddenColumns, useShortCodes und columnWidths werden im Registry-Vertrag validiert.
 * - Legacy-Felder aus dem alten Shape machen den Payload nicht ungültig.
 *
 * Fehlerfälle:
 * - Der Default fällt auf alte Kategorie-Arrays zurück.
 * - Ungültige Arrays, Nicht-Boolean-Werte oder falsche columnWidths werden akzeptiert.
 * - Bestehende Legacy-Payloads würden durch die Registry hart abgewiesen.
 *
 * Ziel:
 * Den Registry-Vertrag für die persistente Vorlaufliste-Spaltenkonfiguration absichern.
 */
import { describe, expect, it } from "vitest";

import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: reports.vorlaufliste.categorySelection", () => {
  const definition = userSettingsRegistry.reportsVorlauflisteCategorySelection;

  it("uses a USER-scoped json setting with an empty object default", () => {
    expect(definition.key).toBe("reports.vorlaufliste.categorySelection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({});
  });

  it("accepts the new column configuration shape", () => {
    expect(definition.validate({
      columnOrder: ["amount", "city", "product-7"],
      hiddenColumns: ["component-9"],
      useShortCodes: true,
      columnWidths: {
        amount: 180,
        "product-7": 320,
      },
    })).toBe(true);
  });

  it("rejects invalid arrays, non-boolean flags and invalid widths", () => {
    expect(definition.validate(null)).toBe(false);
    expect(definition.validate({
      columnOrder: ["amount", "amount"],
    })).toBe(false);
    expect(definition.validate({
      hiddenColumns: ["city", ""],
    })).toBe(false);
    expect(definition.validate({
      useShortCodes: "true",
    })).toBe(false);
    expect(definition.validate({
      columnWidths: {
        amount: 79,
      },
    })).toBe(false);
    expect(definition.validate({
      columnWidths: [],
    })).toBe(false);
  });

  it("ignores legacy category fields instead of rejecting the payload", () => {
    expect(definition.validate({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3],
      useShortCodes: false,
    })).toBe(true);
  });
});
