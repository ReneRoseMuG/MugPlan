/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragsliste besitzt einen eigenen USER-Selection-Key fuer Kategorien und Shortcodes.
 * - Die Auftragsliste besitzt einen eigenen USER-Range-Key fuer Datum und Kalenderwoche.
 *
 * Fehlerfaelle:
 * - Ungueltige Kategorie-IDs oder falsche Boolean-Werte werden akzeptiert.
 * - Der Range-Key akzeptiert ungueltige Tabs oder KW-Werte.
 *
 * Ziel:
 * Die Registry-Vertraege der neuen Auftragslisten-Settings regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: Auftragsliste report settings", () => {
  it("stores the selection key as user-scoped json with categories and shortcode flag", () => {
    const definition = userSettingsRegistry.reportsAuftragslisteSelection;

    expect(definition.key).toBe("reports.auftragsliste.selection");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({ productCategoryIds: [], componentCategoryIds: [], useShortCodes: false });
    expect(definition.validate({ productCategoryIds: [1], componentCategoryIds: [2], useShortCodes: true })).toBe(true);
    expect(definition.validate({ productCategoryIds: [1, 1], componentCategoryIds: [2], useShortCodes: true })).toBe(false);
    expect(definition.validate({ componentCategoryIds: ["1"], useShortCodes: true })).toBe(false);
  });

  it("validates the dedicated range config", () => {
    expect(userSettingsRegistry.reportsAuftragslisteRangeConfig.validate({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 12,
      weekCount: 2,
    })).toBe(true);
    expect(userSettingsRegistry.reportsAuftragslisteRangeConfig.validate({
      activeTab: "columns",
    })).toBe(false);
    expect(userSettingsRegistry.reportsAuftragslisteRangeConfig.validate({
      kwStart: 60,
    })).toBe(false);
  });
});
