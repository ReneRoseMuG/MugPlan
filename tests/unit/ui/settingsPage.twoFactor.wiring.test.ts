/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - SettingsPage verdrahtet den globalen Key `auth_two_factor_enabled`.
 * - Die Admin-Sektion enthaelt Switch und Save-Flow fuer den globalen 2FA-Schalter.
 *
 * Fehlerfaelle:
 * - Fehlende UI-Verdrahtung fuer die globale 2FA-Steuerung.
 *
 * Ziel:
 * Sichtbare Umsetzung der globalen Admin-2FA-Konfiguration in der SettingsPage absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 UI: settings page two-factor wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/SettingsPage.tsx"), "utf8");

  it("wires auth_two_factor_enabled setting and save flow", () => {
    expect(source).toContain('settingsByKey.get("auth_two_factor_enabled")');
    expect(source).toContain('key: "auth_two_factor_enabled"');
    expect(source).toContain('scopeType: "GLOBAL"');
    expect(source).toContain('data-testid="switch-setting-auth-two-factor-enabled"');
    expect(source).toContain('data-testid="button-save-auth-two-factor-enabled"');
  });
});
