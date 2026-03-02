/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminverwaltung und Tourdarstellung
 * Use Case: UC Termin speichern und appointment-basierte Projektionen aktualisieren
 *
 * Abgedeckte Regeln:
 * - AppointmentForm invalidiert calendarAppointments nach Termin-Mutationen.
 * - AppointmentForm invalidiert appointment-bezogene Query-Familien per Predicate.
 * - AppointmentForm invalidiert URL-basierte current-appointments-Queries.
 * - Tour-Management-Terminzaehler wird ueber den Query-Key invalidiert.
 *
 * Fehlerfaelle:
 * - Terminliste zeigt neue Termine erst nach manuellem Toggle von "Alle Termine".
 * - Tour-Kartenzaehler bleibt nach Terminanlage auf 0 wegen stale Cache.
 *
 * Ziel:
 * Sicherstellen, dass AppointmentForm die benoetigten Cache-Invalidierungen fuer alle Terminprojektionen verdrahtet.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01/FT04 appointment form appointment cache invalidation wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("invalidates calendar appointments explicitly", () => {
    expect(source).toContain("queryKey: [\"calendarAppointments\"]");
  });

  it("invalidates appointment projection query families via predicate", () => {
    expect(source).toContain("firstKey === \"appointments-list\"");
    expect(source).toContain("firstKey === \"projects-page-appointments\"");
    expect(source).toContain("firstKey === \"customers-page-appointments\"");
    expect(source).toContain("firstKey === \"employees-page-appointments\"");
    expect(source).toContain("firstKey === \"customerAppointments\"");
    expect(source).toContain("firstKey === \"projectAppointments\"");
    expect(source).toContain("firstKey === \"entityAppointments\"");
    expect(source).toContain("firstKey === \"tour-management-appointments-count\"");
  });

  it("invalidates URL-based current-appointments queries", () => {
    expect(source).toContain("firstKey.includes(\"/current-appointments?\")");
  });

  it("wires appointment invalidation through the shared helper", () => {
    expect(source).toContain("const invalidateRelatedAppointmentQueries = async (projectId: number | null | undefined) => {");
    expect(source).toContain("await invalidateRelatedAppointmentQueries(payload.projectId);");
  });
});
