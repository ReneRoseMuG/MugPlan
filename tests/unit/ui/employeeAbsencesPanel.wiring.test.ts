/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten UI-Verdrahtung
 *
 * Abgedeckte Regeln:
 * - FT30-Panel nutzt die isolierten Employee-Absence-Endpunkte.
 * - Listenladen validiert HTTP-Status und erwartet ein Array statt Fehlerpayloads blind zu rendern.
 * - Erfolgreiche Mutationen invalidieren Employee-Detail und Abwesenheitsliste.
 * - Die FT30-UI bleibt im Mitarbeiterkontext.
 *
 * Fehlerfaelle:
 * - Falsche Endpoint-Verdrahtung.
 * - Fehlende Query-Invalidierung.
 *
 * Ziel:
 * Die isolierte FT30-UI-Verdrahtung ohne Appointment-Bezug absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT30 unit: EmployeeAbsencesPanel wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/EmployeeAbsencesPanel.tsx"),
    "utf8",
  );

  it("uses isolated employee absence endpoints for list, create, update and delete", () => {
    expect(source).toContain("/api/employees/${employeeId}/absences");
    expect(source).toContain("/api/employees/${employeeId}/absences/${editingAbsenceId}");
    expect(source).toContain("/api/employees/${employeeId}/absences/${absenceId}");
  });

  it("guards list loading against non-ok and non-array responses", () => {
    expect(source).toContain("if (!response.ok)");
    expect(source).toContain("if (!Array.isArray(payload))");
    expect(source).toContain("const absenceRows = Array.isArray(absences) ? absences : [];");
  });

  it("invalidates absence list and employee detail after successful mutations", () => {
    expect(source).toContain("queryClient.invalidateQueries({ queryKey })");
    expect(source).toContain('queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] })');
  });

  it("exposes the dedicated FT30 panel test id in employee context", () => {
    expect(source).toContain('data-testid="employee-absences-panel"');
  });
});
