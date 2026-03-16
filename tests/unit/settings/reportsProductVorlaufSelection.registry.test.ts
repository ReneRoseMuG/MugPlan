/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der User-Setting-Key fuer den Produkt-Vorlauf speichert Produkt-, Komponenten- und Sondermass-Tag-Auswahl getrennt.
 * - Nur positive Integer-Arrays ohne Duplikate sowie eine positive Tag-ID oder null sind gueltig.
 *
 * Fehlerfaelle:
 * - Ungueltige JSON-Strukturen, Duplikate oder ungueltige Sondermass-Tag-IDs werden akzeptiert.
 *
 * Ziel:
 * Den Registry-Vertrag fuer die persistente Produkt-Vorlauf-Konfiguration absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: reports.productVorlauf.selection", () => {
  const definition = userSettingsRegistry.reportsProductVorlaufSelection;

  it("uses a USER-scoped json setting with empty arrays and null special-measure tag", () => {
    expect(definition.key).toBe("reports.productVorlauf.selection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({
      productCategoryIds: [],
      componentCategoryIds: [],
      specialMeasureTagId: null,
    });
  });

  it("accepts positive integer arrays and a positive special-measure tag id", () => {
    expect(definition.validate({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3, 4],
      specialMeasureTagId: 9,
    })).toBe(true);
  });

  it("rejects invalid payloads, duplicate ids and invalid special-measure tag ids", () => {
    expect(definition.validate(null)).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1, 1],
      componentCategoryIds: [3],
      specialMeasureTagId: null,
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1],
      componentCategoryIds: [3],
      specialMeasureTagId: 0,
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1],
      componentCategoryIds: ["3"],
      specialMeasureTagId: null,
    })).toBe(false);
  });
});
