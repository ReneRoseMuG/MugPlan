/**
 * Test Scope:
 *
 * Feature: FT04/FT05+ - Terminprojektionen und Kundenverwaltung
 * Use Case: UC Kunde speichern und alle appointment-basierten Projektionen aktualisieren
 *
 * Abgedeckte Regeln:
 * - CustomerData invalidiert calendarAppointments nach Customer-Create/Update.
 * - CustomerData invalidiert appointment-bezogene Query-Familien per Predicate.
 * - CustomerData invalidiert URL-basierte current-appointments-Queries.
 * - updateMutation.onSuccess ruft die zentrale Appointment-Invalidierung auf.
 * - Kundennotiz-Mutationen invalidieren ebenfalls die appointment-basierten Projektionen.
 *
 * Fehlerfaelle:
 * - Nach Kunden-Update bleiben stale Kundennamen in Wochenkarte/Terminlisten sichtbar.
 *
 * Ziel:
 * Sicherstellen, dass CustomerData die Cache-Invalidierung fuer appointment-basierte Sichten zentral verdrahtet.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04/FT05+ customer data appointment cache invalidation wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");
  const source = readFileSync(filePath, "utf8");

  it("invalidates calendar appointments explicitly", () => {
    expect(source).toContain("queryKey: [\"calendarAppointments\"]");
  });

  it("invalidates appointment projection query families via predicate", () => {
    expect(source).toContain("firstKey === \"appointments-list\"");
    expect(source).toContain("firstKey === \"customers-page-appointments\"");
    expect(source).toContain("firstKey === \"employees-page-appointments\"");
    expect(source).toContain("firstKey === \"projects-page-appointments\"");
    expect(source).toContain("firstKey === \"customerAppointments\"");
    expect(source).toContain("firstKey === \"entityAppointments\"");
    expect(source).toContain("firstKey === \"projectAppointments\"");
  });

  it("invalidates URL-based current-appointments queries", () => {
    expect(source).toContain("firstKey.includes(\"/current-appointments?\")");
  });

  it("wires appointment invalidation in update success flow", () => {
    expect(source).toContain("const invalidateAppointmentProjectionQueries = async () => {");
    expect(source).toContain("void invalidateAppointmentProjectionQueries();");
  });

  it("wires appointment invalidation in all customer note mutations", () => {
    expect(source).toContain("apiRequest('POST', `/api/customers/${customerId}/notes`, { title, body, cardColor, print, templateId })");
    expect(source).toContain("apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version })");
    expect(source).toContain("apiRequest('DELETE', `/api/customers/${customerId}/notes/${noteId}`, { version })");
    const invalidationCalls = source.match(/void invalidateAppointmentProjectionQueries\(\);/g) ?? [];
    expect(invalidationCalls.length).toBeGreaterThanOrEqual(5);
  });
});
