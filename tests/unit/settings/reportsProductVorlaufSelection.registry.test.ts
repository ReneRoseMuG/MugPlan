/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der User-Setting-Key fuer den Produkt-Vorlauf speichert Produkt- und Komponentenkategorie-Auswahl getrennt.
 * - Shortcode-Schalter und Sonderblock-Tag-Auswahl gehoeren zur persistierten Produkt-Report-Konfiguration.
 * - Nur positive Integer-Arrays ohne Duplikate sind gueltig.
 *
 * Fehlerfaelle:
 * - Ungueltige JSON-Strukturen oder Duplikate werden akzeptiert.
 *
 * Ziel:
 * Den Registry-Vertrag fuer die persistente Produkt-Vorlauf-Konfiguration absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: reports.productVorlauf.selection", () => {
  const definition = userSettingsRegistry.reportsProductVorlaufSelection;

  it("uses a USER-scoped json setting with empty default arrays", () => {
    expect(definition.key).toBe("reports.productVorlauf.selection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({
      productCategoryIds: [],
      componentCategoryIds: [],
      useShortCodes: false,
      sonderblockTagIds: [],
    });
  });

  it("accepts valid arrays, shortcodes and sonderblock tags", () => {
    expect(definition.validate({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3, 4],
      useShortCodes: true,
      sonderblockTagIds: [5, 6],
    })).toBe(true);
  });

  it("rejects invalid payloads and duplicate ids", () => {
    expect(definition.validate(null)).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1, 1],
      componentCategoryIds: [3],
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1],
      componentCategoryIds: ["3"],
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1],
      componentCategoryIds: [3],
      sonderblockTagIds: [7, 7],
    })).toBe(false);
    expect(definition.validate({
      productCategoryIds: [1],
      componentCategoryIds: [3],
      useShortCodes: "true",
    })).toBe(false);
  });
});
