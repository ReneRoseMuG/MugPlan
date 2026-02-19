/**
 * Test Scope:
 *
 * Feature: FT04/FT02 - Terminanzeige und Projektverwaltung
 * Use Case: UC Projekt speichern und appointment-basierte Projektionen aktualisieren
 *
 * Abgedeckte Regeln:
 * - ProjectForm invalidiert calendarAppointments nach Projekt-Update.
 * - ProjectForm invalidiert weitere appointment-bezogene Query-Familien per Predicate.
 * - invalidateProjectQueries ruft die Appointment-Invalidierung zentral auf.
 *
 * Fehlerfaelle:
 * - Projekt-Speichern ohne Cache-Invalidierung laesst stale Projekttitel in Kalender/Listen stehen.
 *
 * Ziel:
 * Verdrahtung der Cache-Invalidierung fuer appointment-basierte Projektionen regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04/FT02 project form appointment cache invalidation wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("invalidates calendar appointments explicitly", () => {
    expect(source).toContain("queryKey: [\"calendarAppointments\"]");
  });

  it("invalidates appointment projection query families via predicate", () => {
    expect(source).toContain("key === \"appointments-list\"");
    expect(source).toContain("key === \"projects-page-appointments\"");
    expect(source).toContain("key === \"customers-page-appointments\"");
    expect(source).toContain("key === \"employees-page-appointments\"");
    expect(source).toContain("key === \"customerAppointments\"");
    expect(source).toContain("key === \"projectAppointments\"");
  });

  it("wires appointment invalidation into invalidateProjectQueries", () => {
    expect(source).toContain("const invalidateAppointmentProjectionQueries = async () => {");
    expect(source).toContain("await invalidateAppointmentProjectionQueries();");
  });
});
