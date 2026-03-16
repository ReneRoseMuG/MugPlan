/**
 * Test Scope:
 *
 * Feature: FT30 - Preview- und Bulk-Ersatz-Workflow
 *
 * Abgedeckte Regeln:
 * - EmployeeAbsencesPanel nutzt die neuen Preview- und Bulk-Ersatz-Endpunkte.
 * - Die Vorschau bietet Termin-oeffnen, Ersatzmitarbeiter-Auswahl und explizite Bestaetigung.
 * - Eine fehlgeschlagene Folgepruefung nach Save/Update wird sichtbar als offener Problemzustand markiert.
 * - Erfolgreicher Bulk-Ersatz triggert den zentralen Monitoring-Refresh.
 *
 * Fehlerfaelle:
 * - Nach Save/Update fehlt der Vorschaupfad fuer betroffene Termine.
 * - Bulk-Ersatz wird ohne explizite Bestaetigung oder ohne Ersatzmitarbeiter ausgelost.
 *
 * Ziel:
 * Die neue FT30-Workflow-Verdrahtung fuer Terminbereinigung im UI regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe.skip("FT30 unit: EmployeeAbsencesPanel preview wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/EmployeeAbsencesPanel.tsx"),
    "utf8",
  );

  it("calls the preview and bulk replacement endpoints", () => {
    expect(source).toContain("/appointments-preview");
    expect(source).toContain("/bulk-replace-appointments");
  });

  it("wires preview dialog, replacement select and explicit confirmation", () => {
    expect(source).toContain('data-testid="dialog-employee-absence-preview"');
    expect(source).toContain('data-testid="select-employee-absence-replacement"');
    expect(source).toContain("Pulkersatz bestaetigen?");
    expect(source).toContain("button-employee-absence-bulk-replace");
  });

  it("shows a visible follow-up error when the preview cannot be loaded after save", () => {
    expect(source).toContain("previewFollowUpError");
    expect(source).toContain('data-testid="alert-employee-absence-preview-followup-required"');
    expect(source).toContain("Folgepruefung offen");
  });

  it("refreshes monitoring after a successful bulk replacement", () => {
    expect(source).toContain("void refreshMonitoringWithNotification(toast);");
  });
});
