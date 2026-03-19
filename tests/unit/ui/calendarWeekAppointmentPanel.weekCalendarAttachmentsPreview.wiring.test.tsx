/**
 * Test Scope:
 *
 * Feature: FT03/FT24 - Wochenkalender Terminanhaenge
 * Use Case: UC Wochenkarte zeigt Attachment-Hover nur im week-calendar Kontext
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel bindet den Attachment-Hover nur im week-calendar Kontext ein.
 * - Attachment-Hover erhaelt Termin-ID und appointmentAttachmentsCount aus dem Kalendertermin.
 *
 * Fehlerfaelle:
 * - Attachment-Hover erscheint ausserhalb des week-calendar Kontexts.
 * - Termin-ID oder Anhang-Zaehler werden nicht korrekt weitergereicht.
 *
 * Ziel:
 * Die Verdrahtung des neuen Wochenkarten-Attachment-Hovers regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: week calendar attachments hover wiring", () => {
  it("renders attachment hover in week-calendar context and passes attachment-related props", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain('context === "week-calendar"');
    expect(source).toContain("<CalendarWeekAppointmentAttachmentsHover");
    expect(source).toContain("appointmentId={appointment.id}");
    expect(source).toContain("appointmentAttachmentsCount={appointment.appointmentAttachmentsCount ?? 0}");
  });
});
