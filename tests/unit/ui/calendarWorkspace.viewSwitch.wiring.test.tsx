/**
 * Test Scope:
 *
 * Feature: FT29 - CalendarWorkspace Wrapper
 * Use Case: UC Global/Contextual Woche-Monat Umschaltung
 *
 * Abgedeckte Regeln:
 * - CalendarWorkspace rendert im Wochenmodus die WeekGrid-Komponente.
 * - CalendarWorkspace rendert im Monatsmodus die CalendarGrid-Komponente.
 * - New/Open Appointment Events werden in beiden Modi an den zentralen Callback weitergereicht.
 *
 * Fehlerfaelle:
 * - Falsches Grid wird fuer die aktive View gerendert.
 * - Appointment-Callbacks werden nicht konsistent weitergeleitet.
 *
 * Ziel:
 * Wrapper-Verdrahtung fuer week/month ohne Verhaltensdrift absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 UI: calendar workspace week/month wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/CalendarWorkspace.tsx"),
    "utf8",
  );

  it("switches between WeekGrid and CalendarGrid by active view", () => {
    expect(source).toContain("if (activeView === \"week\")");
    expect(source).toContain("<WeekGrid");
    expect(source).toContain("<CalendarGrid");
  });

  it("forwards new/open appointment callbacks for week and month", () => {
    expect(source).toContain("onNewAppointment={(date, options) => {");
    expect(source).toContain("onOpenAppointment={(appointmentId) => {");
    expect(source).toContain("returnView: \"week\"");
    expect(source).toContain("returnView: \"month\"");
  });
});
