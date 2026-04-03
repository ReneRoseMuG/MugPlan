/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der User-Setting-Key fuer die Produktionsplanung speichert nur noch den Shortcode-Schalter.
 * - Die neuen Range-Settings fuer Vorlaufliste und Produktionsplanung validieren Tabs und KW-Werte.
 * - Der Legacy-Key reports.productVorlauf.selection bleibt fuer Alt-Payloads gueltig.
 *
 * Fehlerfaelle:
 * - Alte Kategorie- oder Sonderblockfelder werden im neuen Key weiter akzeptiert.
 * - Ungueltige Tabs oder KW-Werte gelangen in die Range-Settings.
 *
 * Ziel:
 * Die Registry-Vertraege der FT26-Report-Settings regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: FT26 report settings", () => {
  it("stores reports.produktionsplanung.selection as a slim USER-scoped json setting", () => {
    const definition = userSettingsRegistry.reportsProduktionsplanungSelection;

    expect(definition.key).toBe("reports.produktionsplanung.selection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({ useShortCodes: false });
    expect(definition.validate({ useShortCodes: true })).toBe(true);
    expect(definition.validate({ useShortCodes: "true" })).toBe(false);
  });

  it("validates the new range settings for both reports", () => {
    expect(userSettingsRegistry.reportsVorlauflisteRangeConfig.validate({
      activeTab: "columns",
      fromDate: "2026-04-06",
      toDate: "2026-05-08",
      kwStart: 12,
      weekCount: 3,
    })).toBe(true);
    expect(userSettingsRegistry.reportsVorlauflisteRangeConfig.validate({
      activeTab: "invalid",
    })).toBe(false);

    expect(userSettingsRegistry.reportsProduktionsplanungRangeConfig.validate({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 8,
      weekCount: 2,
    })).toBe(true);
    expect(userSettingsRegistry.reportsProduktionsplanungRangeConfig.validate({
      activeTab: "columns",
    })).toBe(false);
    expect(userSettingsRegistry.reportsProduktionsplanungRangeConfig.validate({
      fromDate: "2026/04/07",
    })).toBe(false);
    expect(userSettingsRegistry.reportsProduktionsplanungRangeConfig.validate({
      kwStart: 54,
    })).toBe(false);
  });

  it("keeps the legacy produktvorlauf selection key valid for old payloads", () => {
    const definition = userSettingsRegistry.reportsLegacyProductVorlaufSelection;

    expect(definition.validate({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3],
      useShortCodes: true,
      sonderblockTagIds: [7, 8],
    })).toBe(true);
    expect(definition.validate({
      productCategoryIds: [1, 1],
      componentCategoryIds: [3],
    })).toBe(false);
  });
});
