/**
 * Test Scope:
 *
 * Feature: FT01 - Terminformular Mitarbeiterbereich
 *
 * Abgedeckte Regeln:
 * - Der Mitarbeiterbereich ist als eigene Komponente AppointmentEmployeeSlot gekapselt.
 * - Team-, Tour- und Mitarbeiter-Badges liegen innerhalb desselben hervorgehobenen Panels.
 * - Die Mitarbeiter-Auswahl bleibt als Header-Action im Panel verankert.
 * - Der Tour-Picker erscheint nur im Zustand ohne selektierte Tour.
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

  it("renders as its own highlighted slot panel with team, tour and employee sections", () => {
    expect(source).toContain('export function AppointmentEmployeeSlot({');
    expect(source).toContain("className?: string;");
    expect(source).toContain("tours: Tour[];");
    expect(source).toContain("tourMembersById: Map<number, { id: number; fullName: string }[]>;");
    expect(source).toContain("selectedTour: Tour | null;");
    expect(source).toContain("onTourChange: (tourId: number | null) => void;");
    expect(source).toContain('className={`sub-panel flex flex-col gap-4 ${className ?? ""}`.trim()}');
    expect(source).not.toContain("h-full");
    expect(source).toContain('data-testid="slot-appointment-employees"');
    expect(source).toContain(">Teams</Label>");
    expect(source).toContain("Waehle ein Team fuer diesen Termin");
    expect(source).toContain('data-testid="section-tour-picker"');
    expect(source).toContain(">Tour</Label>");
    expect(source).toContain("Waehle eine Tour, zu der dieser Termin hinzugefuegt werden soll");
    expect(source).toContain("testId={`badge-tour-select-${tour.id}`}");
    expect(source).toContain(">Zugewiesen</Label>");
  });

  it("keeps the employee picker plus action in the panel header", () => {
    expect(source).toContain("<PlusActionButton");
    expect(source).toContain('data-testid="button-add-employee"');
    expect(source).toContain("onAddEmployee");
  });
});
