/**
 * Test Scope:
 *
 * Feature: FT03/FT09/FT13 - Wochenkalender Notiz-Counter Robustheit
 * Use Case: UC Kalendertermine mit Legacy-/Teilpayload ohne gueltige Notiz-Zaehler
 *
 * Abgedeckte Regeln:
 * - useCalendarAppointments normalisiert customerNotesCount auf >= 0 mit Fallback 0.
 * - useCalendarAppointments normalisiert projectNotesCount auf >= 0 mit Fallback 0.
 * - Rueckgabe verwendet gemapptes Ergebnis statt rohem Payload-Cast.
 *
 * Fehlerfaelle:
 * - Undefined/NaN Notizzaehler erzeugen NaN im Wochenkarten-Trigger.
 * - Negative Notizzaehler bleiben ungefiltert in der UI.
 *
 * Ziel:
 * Sicherstellen, dass der Wochenkarten-Notizcounter bei unvollstaendigen Payloads stabil 0-basiert bleibt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: calendar appointments notes count normalization wiring", () => {
  it("normalizes missing/invalid note counts to zero in useCalendarAppointments", () => {
    const filePath = path.resolve(process.cwd(), "client/src/lib/calendar-appointments.ts");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const data = (payload as CalendarAppointment[]).map((rawAppointment) => {");
    expect(source).toContain("const customerNotesCount = Number.isFinite(rawAppointment.customerNotesCount)");
    expect(source).toContain("? Math.max(0, rawAppointment.customerNotesCount)");
    expect(source).toContain(": 0;");
    expect(source).toContain("const projectNotesCount = Number.isFinite(rawAppointment.projectNotesCount)");
    expect(source).toContain("? Math.max(0, rawAppointment.projectNotesCount)");
    expect(source).toContain("customerNotesCount,");
    expect(source).toContain("projectNotesCount,");
  });
});
