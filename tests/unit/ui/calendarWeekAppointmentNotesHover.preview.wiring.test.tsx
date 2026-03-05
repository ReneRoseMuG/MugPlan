/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT09/FT13 - Wochenkalender Notiz-Preview
 * Use Case: UC Notiz-Footer zeigt kumulierten Gesamtzaehler und laedt Kunden-/Projekt-/Terminnotizen on demand
 *
 * Abgedeckte Regeln:
 * - Weekly-Hover nutzt die wiederverwendbare EntityNotesHoverPreview-Komponente.
 * - Weekly-Hover uebergibt kumulative Sources fuer Kunde/Projekt/Termin.
 * - Preview laedt Kunden-/Projekt-/Terminnotizen getrennt ueber die bestehenden Endpoints.
 * - Fehlertext pro Abschnitt lautet "Notizen konnten nicht geladen werden."
 *
 * Fehlerfaelle:
 * - Notiz-Footer wird trotz fehlender Notizen angezeigt.
 * - Preview nutzt nicht die bestehenden Notiz-Endpoints.
 *
 * Ziel:
 * Sicherstellen, dass Trigger- und Preview-Verhalten fuer Wochenkarten-Notizen korrekt verdrahtet sind.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: week appointment notes hover/preview wiring", () => {
  it("wires weekly hover to the reusable entity notes preview with cumulative sources", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentNotesHover.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("EntityNotesHoverPreview");
    expect(source).toContain('sourceMode="cumulative"');
    expect(source).toContain("customer: { id: customerId, count: customerNotesCount }");
    expect(source).toContain("project: { id: projectId, count: projectNotesCount }");
    expect(source).toContain("appointment: { id: appointmentId, count: appointmentNotesCount }");
  });

  it("uses lazy preview loading and resolves customer/project/appointment notes via existing endpoints", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/notes/EntityNotesHoverPreview.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("enabled: customerEnabled");
    expect(source).toContain("enabled: projectEnabled");
    expect(source).toContain("enabled: appointmentEnabled");
    expect(source).toContain("return `/api/customers/${id}/notes`;");
    expect(source).toContain("return `/api/projects/${id}/notes`;");
    expect(source).toContain("return `/api/appointments/${id}/notes`;");
    expect(source).toContain("resolveTitle(\"customer\")");
    expect(source).toContain("resolveTitle(\"project\")");
    expect(source).toContain("resolveTitle(\"appointment\")");
    expect(source).toContain("Notizen konnten nicht geladen werden.");
  });
});
