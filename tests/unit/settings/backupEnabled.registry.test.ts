/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup
 * Use Case: UC07 - Globaler Backup-Schalter
 *
 * Abgedeckte Regeln:
 * - Setting `backup_enabled` ist im Registry-Modell vorhanden.
 * - Defaultwert von `backup_enabled` ist `true`.
 * - Scope ist GLOBAL-only.
 * - Validierung akzeptiert nur passende Typen.
 *
 * Fehlerfaelle:
 * - Nicht-boolean Werte duerfen nicht als gueltig gelten.
 *
 * Ziel:
 * Absichern, dass der globale Backup-Schalter stabil und konsistent konfiguriert ist.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("FT07 settings registry: backup_enabled", () => {
  it("defines backup_enabled as GLOBAL boolean with default true", () => {
    const setting = userSettingsRegistry.backupEnabled;
    expect(setting.key).toBe("backup_enabled");
    expect(setting.type).toBe("boolean");
    expect(setting.defaultValue).toBe(true);
    expect(setting.allowedScopes).toEqual(["GLOBAL"]);
  });

  it("validates only boolean values", () => {
    const setting = userSettingsRegistry.backupEnabled;
    expect(setting.validate(true)).toBe(true);
    expect(setting.validate(false)).toBe(true);
    expect(setting.validate("true")).toBe(false);
    expect(setting.validate(1)).toBe(false);
    expect(setting.validate(null)).toBe(false);
  });
});

describe("FT07 settings registry: backup_lane_tour_ids", () => {
  it("defines backup_lane_tour_ids as GLOBAL string", () => {
    const setting = userSettingsRegistry.backupLaneTourIds;
    expect(setting.key).toBe("backup_lane_tour_ids");
    expect(setting.type).toBe("string");
    expect(setting.defaultValue).toBe("");
    expect(setting.allowedScopes).toEqual(["GLOBAL"]);
  });

  it("accepts only csv values with max 3 positive unique ids", () => {
    const setting = userSettingsRegistry.backupLaneTourIds;
    expect(setting.validate("")).toBe(true);
    expect(setting.validate("1,2,3")).toBe(true);
    expect(setting.validate("1,1")).toBe(false);
    expect(setting.validate("1,2,3,4")).toBe(false);
    expect(setting.validate("abc")).toBe(false);
  });
});
