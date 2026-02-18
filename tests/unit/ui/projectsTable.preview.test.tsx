/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – Projekte Tabellen-Preview
 *
 * Abgedeckte Regeln:
 * - Projekte-Tabelle verwendet die gleiche Weekly-Preview-Erzeugung wie andere Terminlisten.
 * - Fallback fuer fehlende Termine bleibt erhalten.
 *
 * Fehlerfälle:
 * - Keine.
 *
 * Ziel:
 * Sicherstellen, dass die Projekte-Tabellenpreview auf die standardisierte Weekly-Preview umgestellt ist.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT03 projects table preview wiring", () => {
  it("uses createAppointmentWeeklyPanelPreview for relevant appointments", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("createAppointmentWeeklyPanelPreview(row.relevantAppointment).content");
  });

  it("keeps no-appointment fallback text", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Keine Termine vorhanden.");
  });
});
