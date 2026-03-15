/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die drei globalen FT31-Settings sind im Registry-Modell vorhanden.
 * - FT31 nutzt nur GLOBAL-Scopes mit stabilen Defaults und Mindestgrenzen.
 *
 * Fehlerfaelle:
 * - Fehlender Registry-Key fuer Monitoring.
 * - Falscher Scope oder ungueltige Default-Werte fuer TR-01.
 *
 * Ziel:
 * Die zentrale Settings-Definition fuer FT31 regressionssicher absichern.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: monitoring", () => {
  it("defines the global TR-01 settings with stable defaults", () => {
    expect(userSettingsRegistry.monitoringTr01Enabled.key).toBe("monitoring.tr01.enabled");
    expect(userSettingsRegistry.monitoringTr01Enabled.defaultValue).toBe(false);
    expect(userSettingsRegistry.monitoringTr01Enabled.allowedScopes).toEqual(["GLOBAL"]);

    expect(userSettingsRegistry.monitoringTr01HorizonDays.key).toBe("monitoring.tr01.horizonDays");
    expect(userSettingsRegistry.monitoringTr01HorizonDays.defaultValue).toBe(14);
    expect(userSettingsRegistry.monitoringTr01HorizonDays.allowedScopes).toEqual(["GLOBAL"]);

    expect(userSettingsRegistry.monitoringTr01MinimumEmployees.key).toBe("monitoring.tr01.minimumEmployees");
    expect(userSettingsRegistry.monitoringTr01MinimumEmployees.defaultValue).toBe(1);
    expect(userSettingsRegistry.monitoringTr01MinimumEmployees.allowedScopes).toEqual(["GLOBAL"]);
  });
});

