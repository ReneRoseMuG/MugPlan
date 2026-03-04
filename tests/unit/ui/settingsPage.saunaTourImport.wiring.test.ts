/**
 * Test Scope:
 *
 * Feature: TBD - Admin Import Saunatourenliste Preview
 * Use Case: TBD - Einstellungen Arbeitsmodus fuer Schritt-1 Preview
 *
 * Abgedeckte Regeln:
 * - SettingsPage bindet die neue Admin-Gruppe fuer den Saunatouren-Import ein.
 * - Das Arbeitsformular bietet Start, Upload, Vollblatt-/Wochenfenster und Abbrechen.
 * - API-Verdrahtung umfasst Preview, Sheet-Chunk und Cleanup.
 *
 * Fehlerfaelle:
 * - Fehlende Einbindung der Gruppe in der SettingsPage.
 * - Fehlende Verdrahtung von Cleanup beim Abbrechen.
 *
 * Ziel:
 * Sicherstellen, dass die neue Admin-Preview-Flaeche im Einstellungs-Screen sichtbar und verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("TBD UI: settings sauna tour import wiring", () => {
  it("mounts sauna tour preview panel in settings page", () => {
    const settingsPath = path.resolve(process.cwd(), "client/src/components/SettingsPage.tsx");
    const settingsSource = readFileSync(settingsPath, "utf8");

    expect(settingsSource).toContain("SaunaTourImportPreviewPanel");
    expect(settingsSource).toContain("<SaunaTourImportPreviewPanel />");
  });

  it("wires workmode actions and API calls in preview panel", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/settings/SaunaTourImportPreviewPanel.tsx");
    const panelSource = readFileSync(panelPath, "utf8");

    expect(panelSource).toContain("settings-group-sauna-tour-import");
    expect(panelSource).toContain("button-open-sauna-tour-import-workmode");
    expect(panelSource).toContain("button-cancel-sauna-tour-workmode");
    expect(panelSource).toContain("button-run-sauna-tour-preview");
    expect(panelSource).toContain("button-sauna-tour-view-fullsheet");
    expect(panelSource).toContain("button-sauna-tour-view-weekwindow");
    expect(panelSource).toContain("button-sauna-tour-load-more-rows");
    expect(panelSource).toContain("api.admin.saunaTourImportPreviewSheetRows.path");
    expect(panelSource).toContain("api.admin.saunaTourImportPreview.path");
    expect(panelSource).toContain("api.admin.saunaTourImportPreviewCleanup.path");
  });
});
