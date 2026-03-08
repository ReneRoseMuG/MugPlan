/**
 * Test Scope:
 *
 * Feature: FT01 - Terminformular Mitarbeiterbereich
 *
 * Abgedeckte Regeln:
 * - Der Mitarbeiterbereich ist als eigene Komponente AppointmentEmployeeSlot gekapselt.
 * - Team-Badges liegen innerhalb desselben hervorgehobenen Panels wie die zugewiesenen Mitarbeiter.
 * - Die Mitarbeiter-Auswahl bleibt als Header-Action im Panel verankert.
 *
 * Fehlerfaelle:
 * - Mitarbeiter- und Teambereich zerfallen wieder in getrennte Blaecke.
 * - AppointmentForm baut den Mitarbeiterbereich inline statt ueber AppointmentEmployeeSlot.
 *
 * Ziel:
 * Die neue Panel-Struktur des Mitarbeiterbereichs im Terminformular regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: AppointmentEmployeeSlot wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentEmployeeSlot.tsx"), "utf8");

  it("renders as its own highlighted slot panel with team and employee sections", () => {
    expect(source).toContain('export function AppointmentEmployeeSlot({');
    expect(source).toContain("className?: string;");
    expect(source).toContain('className={`sub-panel flex h-full flex-col gap-4 ${className ?? ""}`.trim()}');
    expect(source).toContain('data-testid="slot-appointment-employees"');
    expect(source).toContain(">Teams</Label>");
    expect(source).toContain(">Zugewiesene Mitarbeiter</Label>");
  });

  it("keeps the employee picker plus action in the panel header", () => {
    expect(source).toContain("<PlusActionButton");
    expect(source).toContain('data-testid="button-add-employee"');
    expect(source).toContain("onAddEmployee");
  });
});
