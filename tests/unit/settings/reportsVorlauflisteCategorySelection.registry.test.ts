/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der User-Setting-Key fuer die Vorlaufliste speichert Produkt- und Komponentenkategorie-IDs getrennt.
 * - Nur positive Integer-Arrays ohne Duplikate sind gueltig.
 *
 * Fehlerfaelle:
 * - Ungueltige JSON-Strukturen oder Duplikate werden als gueltig akzeptiert.
 *
 * Ziel:
 * Den Registry-Vertrag fuer die persistente Vorlaufliste-Kategorieauswahl absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: reports.vorlaufliste.categorySelection", () => {
  const definition = userSettingsRegistry.reportsVorlauflisteCategorySelection;

  it("uses a USER-scoped json setting with empty default arrays", () => {
    expect(definition.key).toBe("reports.vorlaufliste.categorySelection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({
      productCategoryIds: [],
      componentCategoryIds: [],
    });
  });

  it("accepts positive integer arrays without duplicates", () => {
    expect(definition.validate({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3, 4],
    })).toBe(true);
  });

  it("rejects invalid payloads and duplicate ids", () => {
    expect(definition.validate(null)).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1, 1],
      componentCategoryIds: [3],
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: ["1"],
      componentCategoryIds: [3],
    })).toBe(false);
  });
});
