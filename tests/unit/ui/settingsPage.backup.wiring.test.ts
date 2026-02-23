/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup
 * Use Case: UC07 - Admin-Backupeinstellungen und Monitoring
 *
 * Abgedeckte Regeln:
 * - SettingsPage verdrahtet den globalen Key `backup_enabled`.
 * - SettingsPage bietet Save-Flow fuer `backup_enabled` im GLOBAL-Scope.
 * - Backuptabelle verwendet die geforderten Spalten inkl. Created.
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung der Backup-Aktivierung oder Monitoring-Spalten.
 *
 * Ziel:
 * Sicherstellen, dass der Erweiterungsauftrag fuer Backup-Aktivierung und Monitoring sichtbar umgesetzt ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT07 UI: settings page backup wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/SettingsPage.tsx"), "utf8");

  it("wires backup_enabled setting and save flow", () => {
    expect(source).toContain('settingsByKey.get("backup_enabled")');
    expect(source).toContain('key: "backup_enabled"');
    expect(source).toContain('scopeType: "GLOBAL"');
    expect(source).toContain('data-testid="switch-setting-backup-enabled"');
    expect(source).toContain('data-testid="button-save-backup-enabled"');
  });

  it("contains backup monitoring table with required columns", () => {
    expect(source).toContain("Backups (Read-Only Monitoring)");
    expect(source).toContain("<th className=\"px-2 py-2\">Created</th>");
    expect(source).toContain("<th className=\"px-2 py-2\">Status</th>");
    expect(source).toContain("<th className=\"px-2 py-2\">Fehlermeldung</th>");
    expect(source).toContain("Anzahl exportierter Datensaetze");
    expect(source).toContain("<th className=\"px-2 py-2\">Download</th>");
  });
});
