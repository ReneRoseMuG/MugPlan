/**
 * Test Scope:
 *
 * Feature: FT29 - Projektkontext Einstieg in CalendarWorkspace
 * Use Case: UC Kalender oeffnen aus bestehendem Projekt
 *
 * Abgedeckte Regeln:
 * - ProjectForm bietet einen dedizierten Callback `onOpenCalendarWorkspace`.
 * - Der Callback wird an das ProjectAppointmentsPanel durchgereicht.
 * - Der Einstieg erfolgt ueber den Plus-Button im Termine-Panel, nicht ueber einen separaten Formularbutton.
 *
 * Fehlerfaelle:
 * - Kein Kontext-Einstieg aus dem Projektformular moeglich.
 * - Verdrahtung zum Sidebar-Plusbutton fehlt.
 *
 * Ziel:
 * Kontextsicheren Einstiegspunkt aus dem Projektformular absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 project form calendar workspace panel wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx"), "utf8");

  it("exposes callback prop for contextual calendar open", () => {
    expect(source).toContain("onOpenCalendarWorkspace?: (ctx: { projectId: number }) => void;");
  });

  it("passes contextual calendar callback into project appointments panel", () => {
    expect(source).toContain("<ProjectAppointmentsPanel");
    expect(source).toContain("onOpenCalendarWorkspace={onOpenCalendarWorkspace}");
    expect(source).not.toContain("button-open-calendar-workspace");
  });
});
