/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetext Vorschaugroesse
 * Use Case: UC Einstellungen fuer HelpText Preview Size
 *
 * Abgedeckte Regeln:
 * - SettingsPage verdrahtet den USER-Key `helpTextPreviewSize`.
 * - SettingsPage bietet Save-Flow fuer `helpTextPreviewSize` im USER-Scope.
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung der Hilfetext-Preview-Groesse in der SettingsPage.
 *
 * Ziel:
 * Sicherstellen, dass die neue Preview-Groesse zentral konfigurierbar ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 UI: settings page help text preview size wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/SettingsPage.tsx"), "utf8");

  it("wires helpTextPreviewSize setting and save flow", () => {
    expect(source).toContain("settingsByKey.get(\"helpTextPreviewSize\")");
    expect(source).toContain("key: \"helpTextPreviewSize\"");
    expect(source).toContain("scopeType: \"USER\"");
    expect(source).toContain("data-testid=\"select-setting-helpTextPreviewSize\"");
    expect(source).toContain("data-testid=\"button-save-helpTextPreviewSize\"");
  });
});
