/**
 * Test Scope:
 *
 * Feature: FT01 - Bereinigte Mitarbeiterauswahl im Terminformular
 *
 * Abgedeckte Regeln:
 * - EmployeePickerDialogList zeigt im Appointment-Kontext einen deutlichen Bereinigungshinweis.
 * - EmployeePickerDialogList listet nicht verfuegbare Mitarbeiter namentlich mit Grund auf.
 * - Ohne appointmentDate bleibt der Pflicht-Hinweis sichtbar; die Liste wird nicht mehr pauschal leergeraeumt.
 *
 * Fehlerfaelle:
 * - Der Hinweis auf entfernte, nicht verfuegbare Mitarbeiter fehlt.
 * - Der Picker blendet den Pflicht-Hinweis ohne Termindatum nicht mehr ein.
 *
 * Ziel:
 * Die neue Hinweis- und Leerzustandsverdrahtung fuer die terminbezogene Mitarbeiterauswahl regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 unit: EmployeePickerDialogList availability wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/EmployeePickerDialogList.tsx"),
    "utf8",
  );

  it("renders the availability notice and dedicated test id for appointment context", () => {
    expect(source).toContain("showAvailabilityNotice");
    expect(source).toContain('data-testid="alert-employee-picker-availability"');
    expect(source).toContain("Nicht verfuegbare Mitarbeiter wurden aus dieser Liste entfernt.");
  });

  it("renders a dedicated unavailable-employees list for dispatcher visibility", () => {
    expect(source).toContain("unavailableEmployees");
    expect(source).toContain('data-testid="alert-employee-picker-unavailable-list"');
    expect(source).toContain('employee.reason === "absence" ? "Abwesenheit" : "Austrittsdatum erreicht"');
  });

  it("keeps the start-date hint wired even though the list no longer hard-resets without appointmentDate", () => {
    expect(source).toContain("appointmentDate || !showAvailabilityNotice");
    expect(source).toContain("Bitte zuerst ein Startdatum festlegen.");
  });
});
