/**
 * Test Scope:
 *
 * Feature: FT26 - Auftragsliste-Settings
 *
 * Abgedeckte Regeln:
 * - Auftragslisten-Auswahl und Zeitraum werden nicht mehr als implizite User-Settings angeboten.
 * - Report-Settings enthalten nur noch das globale Produktionsplanungs-Layout.
 * - Auftragslisten-Defaults bleiben lokale UI-/Preset-Daten und werden nicht ueber useSettings aufgeloest.
 *
 * Fehlerfaelle:
 * - Alte Auftragslisten-Keys tauchen erneut in der Settings-Registry auf.
 * - Veraltete Report-Settings werden neben reports.categoryLayout wieder sichtbar.
 */
import { describe, expect, it } from "vitest";

import { settingDefinitions } from "../../../server/settings/registry";

const removedAuftragslisteSettingKeys = [
  "reports.auftragsliste.selection",
  "reports.auftragsliste.rangeConfig",
  "reports.auftragsliste.productCategoryIds",
  "reports.auftragsliste.componentCategoryIds",
  "reports.auftragsliste.useShortCodes",
];

describe("useSettings: auftragsliste persistence removal", () => {
  it("does not expose Auftragsliste state as user settings", () => {
    const settingKeys = settingDefinitions.map((definition) => definition.key);
    const reportSettingKeys = settingKeys.filter((key) => key.startsWith("reports."));

    expect(reportSettingKeys).toEqual(["reports.categoryLayout"]);
    expect(settingKeys).toEqual(expect.not.arrayContaining(removedAuftragslisteSettingKeys));
    expect(settingKeys.filter((key) => key.includes("auftragsliste"))).toEqual([]);
  });
});
