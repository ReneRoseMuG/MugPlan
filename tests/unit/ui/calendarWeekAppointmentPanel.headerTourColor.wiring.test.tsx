/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC Wochenkarte zeigt Tourfarbe im Header
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel gibt die Tourfarbe als Header-Farbe weiter.
 * - Fallback auf CALENDAR_NEUTRAL_COLOR bleibt erhalten.
 * - Header rendert die Farbe als Hintergrund mit kontrastierter Textfarbe.
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

    expect(source).toContain("import { CALENDAR_NEUTRAL_COLOR } from \"@/lib/calendar-utils\"");
    expect(source).toContain("color={appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR}");
  });

  it("applies provided color to header background and computes readable text color", () => {
    const headerPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx");
    const source = readFileSync(headerPath, "utf8");

    expect(source).toContain("color: string;");
    expect(source).toContain("const textColor = (() => {");
    expect(source).toContain("backgroundColor: color");
    expect(source).toContain("color: textColor");
    expect(source).toContain("backgroundImage:");
    expect(source).toContain("boxShadow:");
  });
});
