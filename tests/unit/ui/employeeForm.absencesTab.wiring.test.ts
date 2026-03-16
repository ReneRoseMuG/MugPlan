/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterformular Abwesenheitsbereich
 *
 * Abgedeckte Regeln:
 * - EmployeeForm bietet einen eigenen Tab fuer Abwesenheiten.
 * - Neue Mitarbeiter erhalten dort einen Save-First-Hinweis.
 * - Persistierte Mitarbeiter binden das FT30-Panel im bestehenden Kontext ein.
 *
 * Fehlerfaelle:
 * - FT30-Tab fehlt im Mitarbeiterformular.
 * - Der Abwesenheitsbereich ist nicht an den Mitarbeiterkontext gebunden.
 *
 * Ziel:
 * Die Einbindung des isolierten FT30-Bereichs in das bestehende Mitarbeiterformular absichern.
 */
import { describe, expect, it } from "vitest";
import { EmployeeForm } from "../../../client/src/components/EmployeeForm";

describe.skip("FT30 unit: EmployeeForm absences tab wiring", () => {
  const source = EmployeeForm.toString();

  it("adds the dedicated absences tab to the employee form", () => {
    expect(source).toContain('value: "abwesenheiten"');
    expect(source).toContain('"data-testid": "tab-employee-abwesenheiten"');
    expect(source).toContain("Abwesenheiten");
  });

  it("shows the save-first hint for new employees and renders the FT30 panel for persisted employees", () => {
    expect(source).toContain("Nach dem Speichern des Mitarbeiters koennen Abwesenheiten erfasst werden.");
    expect(source).toContain("EmployeeAbsencesPanel");
    expect(source).toContain("employeeId, employees: allEmployees");
  });
});
