/**
 * Test Scope:
 *
 * Feature: Entfernen impliziter Report-Settings zugunsten von Presets
 *
 * Abgedeckte Regeln:
 * - Alte reportbezogene User-Settings werden in der Registry nicht mehr angeboten.
 * - reports.categoryLayout bleibt als einziges reportbezogenes Setting global erhalten.
 *
 * Fehlerfälle:
 * - Alte Range-, Auswahl-, Druck- oder Legacy-Keys tauchen erneut in resolved settings auf.
 * - Das globale Kategorie-Layout der Produktionsplanung wird versehentlich entfernt.
 */
import { describe, expect, it } from "vitest";

import { settingDefinitions, userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: report persistence removal", () => {
  it("keeps only reports.categoryLayout among report settings", () => {
    const reportSettingKeys = settingDefinitions
      .map((definition) => definition.key)
      .filter((key) => key.startsWith("reports."));

    expect(reportSettingKeys).toEqual(["reports.categoryLayout"]);
    expect(userSettingsRegistry.reportsCategoryLayout.key).toBe("reports.categoryLayout");
    expect(userSettingsRegistry.reportsCategoryLayout.allowedScopes).toEqual(["GLOBAL"]);
  });
});
