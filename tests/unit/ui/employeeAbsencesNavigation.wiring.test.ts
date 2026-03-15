/**
 * Test Scope:
 *
 * Feature: FT30 - Hauptnavigation Abwesenheiten
 *
 * Abgedeckte Regeln:
 * - Home und Sidebar bieten einen eigenen Hauptnavigationspunkt fuer Abwesenheiten.
 * - Die Navigationsansicht nutzt Mitarbeiterauswahl und die bestehende FT30-Abwesenheitslogik.
 * - Die Navigationsansicht rendert Abwesenheiten als Tabelle statt als Kartenliste.
 *
 * Fehlerfaelle:
 * - Hauptnavigation fuer Abwesenheiten fehlt.
 * - Die Navigationsansicht baut eine zweite FT30-Logik parallel zum Mitarbeiterformular.
 *
 * Ziel:
 * Die neue globale Abwesenheiten-Ansicht als sauber eingebundene Wiederverwendung des bestehenden FT30-Bereichs absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT30 unit: Employee absences navigation wiring", () => {
  const homeSource = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const sidebarSource = readFileSync(path.resolve(process.cwd(), "client/src/components/Sidebar.tsx"), "utf8");
  const pageSource = readFileSync(path.resolve(process.cwd(), "client/src/components/EmployeeAbsencesPage.tsx"), "utf8");
  const panelSource = readFileSync(path.resolve(process.cwd(), "client/src/components/EmployeeAbsencesPanel.tsx"), "utf8");

  it("registers employeeAbsences in home and sidebar navigation", () => {
    expect(homeSource).toContain('| "employeeAbsences"');
    expect(homeSource).toContain('view === "employeeAbsences"');
    expect(homeSource).toContain("EmployeeAbsencesPage");
    expect(sidebarSource).toContain('label="Abwesenheiten"');
    expect(sidebarSource).toContain('currentView === "employeeAbsences"');
  });

  it("uses a dedicated employee selector in the navigation page", () => {
    expect(pageSource).toContain('title="Abwesenheiten"');
    expect(pageSource).toContain('data-testid="select-employee-absences-employee"');
    expect(pageSource).toContain("Mitarbeiter waehlen");
    expect(pageSource).toContain("EmployeeAbsencesPanel");
    expect(pageSource).toContain('listVariant="table"');
  });

  it("supports table rendering in the reusable FT30 panel", () => {
    expect(panelSource).toContain('listVariant?: "cards" | "table"');
    expect(panelSource).toContain('testId="table-employee-absences"');
    expect(panelSource).toContain('listVariant === "table"');
  });
});
