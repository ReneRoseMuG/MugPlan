/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT09/FT13 - Wochenkalender Notiz-Footer
 * Use Case: UC Wochenkarte zeigt Notiz-Hover nur im week-calendar Kontext
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel bindet den Notes-Hover nur im week-calendar Kontext ein.
 * - Notes-Hover erhaelt customerId, projectId, appointmentId und alle drei Notizzaehler aus dem Termin.
 *
 * Fehlerfaelle:
 * - Notiz-Hover erscheint ausserhalb des week-calendar Kontexts.
 * - Notizzaehler oder IDs werden nicht korrekt weitergereicht.
 *
 * Ziel:
 * Verdrahtung des neuen Wochenkarten-Notiz-Footers regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: week calendar notes hover wiring", () => {
  it("renders notes hover in week-calendar context and passes note-related props", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain('context === "week-calendar"');
    expect(source).toContain("<CalendarWeekAppointmentNotesHover");
    expect(source).toContain("customerId={appointment.customer.id}");
    expect(source).toContain("projectId={appointment.projectId}");
    expect(source).toContain("appointmentId={appointment.id}");
    expect(source).toContain("customerNotesCount={appointment.customerNotesCount ?? 0}");
    expect(source).toContain("projectNotesCount={appointment.projectNotesCount ?? 0}");
    expect(source).toContain("appointmentNotesCount={appointment.appointmentNotesCount ?? 0}");
  });

  it("keeps the notes hover inside spanning tiles for multi-day appointments", () => {
    const tilePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekSpanningTile.tsx");
    const source = readFileSync(tilePath, "utf8");

    expect(source).toContain("<CalendarWeekAppointmentNotesHover");
    expect(source).toContain("appointmentId={appointment.id}");
    expect(source).toContain("customerNotesCount={appointment.customerNotesCount ?? 0}");
    expect(source).toContain("projectNotesCount={appointment.projectNotesCount ?? 0}");
    expect(source).toContain("appointmentNotesCount={appointment.appointmentNotesCount ?? 0}");
  });
});
