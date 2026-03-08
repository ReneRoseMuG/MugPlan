/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC Wochenkarte zeigt Tourfarbe im Header
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel gibt die Tourfarbe und Datums-/Zeitdaten in den Header weiter.
 * - Fallback auf CALENDAR_NEUTRAL_COLOR bleibt erhalten.
 * - Header rendert die Farbe als Hintergrund mit weisser Schrift und Zweizeilen-Layout.
 *
 * Fehlerfaelle:
 * - Wochenkarten-Header bleibt grau statt Tourfarbe.
 *
 * Ziel:
 * Verdrahtung und Styling fuer farbigen Wochenkarten-Header regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: week appointment panel header tour color wiring", () => {
  it("passes appointment tour color with neutral fallback to panel header", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain("CALENDAR_NEUTRAL_COLOR");
    expect(source).toContain("color={appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR}");
    expect(source).toContain("startDate={appointment.startDate}");
    expect(source).toContain("endDate={appointment.endDate}");
    expect(source).toContain("startTime={appointment.startTime}");
  });

  it("wires preview-only tour name line with unassigned fallback color", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain("showPreviewTourNameLine?: boolean;");
    expect(source).toContain("const resolvedTourName = appointment.tourName?.trim() || \"Ohne Tour\";");
    expect(source).toContain("CALENDAR_UNASSIGNED_TOUR_COLOR");
    expect(source).toContain("backgroundColor: resolvedTourColor");
  });

  it("applies provided color to header background and keeps header text white", () => {
    const headerPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx");
    const source = readFileSync(headerPath, "utf8");

    expect(source).toContain("color: string;");
    expect(source).toContain("backgroundColor: color");
    expect(source).toContain('color: "#ffffff"');
    expect(source).toContain("backgroundImage:");
    expect(source).toContain("boxShadow:");
    expect(source).toContain("CalendarRange");
    expect(source).toContain("const dayCountLabel = `${dayCount} ${dayCount === 1 ? \"Tag\" : \"Tage\"}`;");
    expect(source).toContain('className="grid grid-cols-[auto_1fr_auto] items-center gap-2"');
    expect(source).toContain('className="inline-flex items-center justify-center"');
    expect(source).toContain('className="min-w-0 text-center"');
    expect(source).toContain('className="shrink-0 text-right justify-self-end"');
    expect(source).toContain("border-t border-white/20 pt-1");
  });
});
