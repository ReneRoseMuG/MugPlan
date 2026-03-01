/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup
 * Use Case: UC07 - Globale Sichtbarkeit des Backup-Deaktivierungszustands
 *
 * Abgedeckte Regeln:
 * - Home liest `backup_enabled` aus den Settings.
 * - Home reicht den Zustand als `backupDisabled` an die Sidebar weiter.
 * - Sidebar mappt `backupDisabled` auf roten Rahmen (`border-red-600`).
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung zwischen Settings und Sidebar.
 *
 * Ziel:
 * Sicherstellen, dass deaktivierte Backups im Navigationsbereich visuell eindeutig markiert werden.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT07 UI: sidebar backup disabled wiring", () => {
  const homeSource = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const sidebarSource = readFileSync(path.resolve(process.cwd(), "client/src/components/Sidebar.tsx"), "utf8");

  it("wires backup_enabled setting in Home and forwards backupDisabled prop", () => {
    expect(homeSource).toContain('useSetting("backup_enabled")');
    expect(homeSource).toContain("const backupDisabled = backupEnabled === false;");
    expect(homeSource).toContain("backupDisabled={backupDisabled}");
  });

  it("wires main navigation appointments list with dedicated helpKey", () => {
    expect(homeSource).toContain("view === 'appointmentsList'");
    expect(homeSource).toContain("helpKey=\"appointments.list.mainNavigation\"");
  });

  it("applies red border style in Sidebar when backupDisabled is true", () => {
    expect(sidebarSource).toContain("backupDisabled = false");
    expect(sidebarSource).toContain('backupDisabled ? "border-2 border-red-600" : ""');
  });
});
