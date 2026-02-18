/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Mitarbeiter-Hover nur in der direkten Wochenansicht
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel bietet den Kontext "week-calendar" an.
 * - Im Kontext "week-calendar" wird ein Bottom-Hover statt Inline-Mitarbeiter gerendert.
 * - Standardkontext behaelt die bestehende Inline-Mitarbeiterdarstellung.
 * - CalendarWeekView setzt den Kontext "week-calendar" bei Karten in der Wochenansicht.
 *
 * Fehlerfaelle:
 * - Kontextlose globale Verhaltensaenderung in anderen Panel-Nutzungen.
 * - Fehlende Verdrahtung des Wochenkontexts in CalendarWeekView.
 *
 * Ziel:
 * Sicherstellen, dass die neue Mitarbeiter-Preview nur in der direkten Wochenansicht aktiv ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: week calendar employee hover wiring", () => {
  it("defines week-calendar context in CalendarWeekAppointmentPanel", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain('context?: "default" | "week-calendar"');
    expect(source).toContain('context = "default"');
  });

  it("uses hover component only in week-calendar context and keeps default inline employees", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain("context === \"week-calendar\"");
    expect(source).toContain("<CalendarWeekAppointmentEmployeesHover employees={appointment.employees} />");
    expect(source).toContain("<CalendarWeekAppointmentPanelEmployee employees={appointment.employees} />");
  });

  it("wires week-calendar context in CalendarWeekView", () => {
    const viewPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx");
    const source = readFileSync(viewPath, "utf8");

    expect(source).toContain('context="week-calendar"');
  });
});
