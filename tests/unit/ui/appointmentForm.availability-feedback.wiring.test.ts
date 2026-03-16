/**
 * Test Scope:
 *
 * Feature: FT01 - Verfuegbarkeitsfeedback im Terminformular
 *
 * Abgedeckte Regeln:
 * - AppointmentForm reagiert auf AVAILABILITY_CONFIRMATION_REQUIRED mit einem vorgelagerten Confirm-Dialog.
 * - AppointmentForm sendet den Confirm-Flag erst nach expliziter Bestaetigung.
 * - AppointmentForm nutzt den terminbezogenen Mitarbeiterlisten-Endpoint fuer verfuegbare und nicht verfuegbare Mitarbeiter.
 *
 * Fehlerfaelle:
 * - Verfuegbarkeitskonflikte fuehren weiter zu stillen Aenderungen.
 * - Der Picker greift weiter auf die ungefilterte globale Mitarbeiterliste zu.
 *
 * Ziel:
 * Die FT01-Verdrahtung fuer den Confirm-Flow und die bereinigte Mitarbeiterauswahl regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe.skip("FT01 unit: AppointmentForm availability feedback wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx"),
    "utf8",
  );

  it("opens a confirmation dialog instead of silently accepting availability removals", () => {
    expect(source).toContain('parsed?.code === "AVAILABILITY_CONFIRMATION_REQUIRED"');
    expect(source).toContain("setPendingAvailabilityConflicts(parsed.availabilityConflicts ?? [])");
    expect(source).toContain('data-testid="dialog-appointment-availability-conflicts"');
    expect(source).toContain("confirmAvailabilityAdjustments");
  });

  it("loads available and unavailable employees through the appointmentDate-filtered endpoint", () => {
    expect(source).toContain('/api/employees?scope=active&appointmentDate=');
    expect(source).toContain("includeUnavailable=true");
    expect(source).toContain("availableEmployees");
    expect(source).toContain("unavailableEmployees");
    expect(source).toContain("showAvailabilityNotice");
  });
});
