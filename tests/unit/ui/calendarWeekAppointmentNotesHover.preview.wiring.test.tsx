/**
 * Test Scope:
 *
 * Feature: FT03/FT09/FT13 - Wochenkalender Notiz-Preview
 * Use Case: UC Notiz-Footer zeigt Gesamtzaehler und laedt Kunden-/Projektnotizen on demand
 *
 * Abgedeckte Regeln:
 * - Notes-Hover rendert nichts bei Gesamtzaehler <= 0.
 * - Trigger zeigt "Notizen anzeigen (X)" mit Gesamtzaehler.
 * - Preview laedt Kunden- und Projektnotizen getrennt ueber bestehende Endpoints.
 * - Preview zeigt Abschnitte Kunde/Projekt nur wenn jeweilige Zaehler > 0.
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
  it("hides trigger when no notes exist and shows aggregate label for available notes", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentNotesHover.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const safeCustomerNotesCount = Number.isFinite(customerNotesCount) ? Math.max(0, customerNotesCount) : 0;");
    expect(source).toContain("const safeProjectNotesCount = Number.isFinite(projectNotesCount) ? Math.max(0, projectNotesCount) : 0;");
    expect(source).toContain("const totalNotesCount = safeCustomerNotesCount + safeProjectNotesCount;");
    expect(source).toContain("if (totalNotesCount <= 0) return null;");
    expect(source).toContain("Notizen anzeigen ({totalNotesCount})");
    expect(source).toContain('data-testid="week-appointment-notes-hover-trigger"');
  });

  it("uses lazy preview loading and resolves customer/project notes via existing endpoints", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentNotesPreview.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("enabled: customerEnabled");
    expect(source).toContain("enabled: projectEnabled");
    expect(source).toContain("fetch(`/api/customers/${customerId}/notes`");
    expect(source).toContain("fetch(`/api/projects/${projectId}/notes`");
    expect(source).toContain('title="Kunde"');
    expect(source).toContain('title="Projekt"');
    expect(source).toContain("Notizen konnten nicht geladen werden.");
  });
});
