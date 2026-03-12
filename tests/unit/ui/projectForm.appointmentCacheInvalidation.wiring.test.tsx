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
 * - Projektnotiz-Mutationen invalidieren ebenfalls die appointment-basierten Projektionen.
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
  const helperSource = readFileSync(path.resolve(process.cwd(), "client/src/lib/tag-invalidation.ts"), "utf8");

  it("invalidates calendar appointments explicitly", () => {
    expect(helperSource).toContain("queryKey: [\"calendarAppointments\"]");
  });

  it("invalidates appointment projection query families via predicate", () => {
    expect(helperSource).toContain("firstKey === \"appointments-list\"");
    expect(helperSource).toContain("firstKey === \"/api/projects/list\"");
    expect(helperSource).toContain("firstKey === \"/api/customers/list\"");
    expect(helperSource).toContain("firstKey === \"projects-page-appointments\"");
    expect(helperSource).toContain("firstKey === \"customers-page-appointments\"");
    expect(helperSource).toContain("firstKey === \"employees-page-appointments\"");
    expect(helperSource).toContain("firstKey === \"customerAppointments\"");
    expect(helperSource).toContain("firstKey === \"projectAppointments\"");
  });

  it("wires appointment invalidation into invalidateProjectQueries", () => {
    expect(source).toContain("const invalidateAppointmentProjectionQueries = async () => {");
    expect(source).toContain("await invalidateTagProjectionQueries();");
    expect(source).toContain("await invalidateAppointmentProjectionQueries();");
  });

  it("wires appointment invalidation in all project note mutations", () => {
    expect(source).toContain("apiRequest('POST', `/api/projects/${projectId}/notes`, data)");
    expect(source).toContain("apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version })");
    expect(source).toContain("apiRequest('DELETE', `/api/projects/${projectId}/notes/${noteId}`, { version })");
    const invalidationCalls = source.match(/void invalidateAppointmentProjectionQueries\(\);/g) ?? [];
    expect(invalidationCalls.length).toBeGreaterThanOrEqual(3);
  });
});
