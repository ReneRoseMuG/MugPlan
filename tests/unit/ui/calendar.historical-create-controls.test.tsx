/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 * Use Case: UC05 - Kalender-/Tabellen-UI ohne Erzeugungsaktion fuer Vergangenheit
 *
 * Abgedeckte Regeln:
 * - Monatsansicht zeigt New-Appointment-Button nur fuer Tage >= heute (Berlin).
 * - Monatsansicht rendert die Tageszahl im Kachelkopf vor dem Plus-Button.
 * - Monatsansicht setzt den Kachelkopf mit einer dezenten Hintergrundflaeche ab.
 * - Wochenansicht zeigt New-Appointment-Button nur fuer Tage >= heute (Berlin).
 * - Jahresansicht zeigt New-Appointment-Button nur fuer Tage >= heute (Berlin).
 * - Tabellenansicht enthaelt keine Aktion zur Erstellung historischer Termine.
 * - Monatsansicht erlaubt Drag nur fuer nicht-historische und nicht-gesperrte Termine.
 * - Wochenansicht erlaubt Segment-Drag nur fuer nicht-historische und nicht-gesperrte Termine.
 *
 * Fehlerfaelle:
 * - Sichtbare Plus-Aktionen fuer Vergangenheitsdaten.
 * - Tabellenaktion zur Termin-Neuanlage in historischem Kontext.
 * - Drag-Start ist fuer historische Termine weiterhin moeglich.
 *
 * Ziel:
 * Deterministische Absicherung der UI-Schutzregeln gegen historische Termin-Neuanlage.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: calendar historical create controls", () => {
  const monthSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarMonthView.tsx"), "utf8");
  const weekSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");
  const yearSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarYearView.tsx"), "utf8");
  const listSource = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx"), "utf8");

  it("guards month create button behind day >= berlinToday", () => {
    expect(monthSource).toContain("const berlinToday = getBerlinTodayDateString();");
    expect(monthSource).toContain("{dayKey >= berlinToday ? (");
    expect(monthSource).toContain("data-testid={`button-new-appointment-${dayKey}`}" );
  });

  it("renders month day header with date before plus button and subtle background separation", () => {
    const dayNumberIndex = monthSource.indexOf('{format(day, "d")}');
    const plusGuardIndex = monthSource.indexOf("{dayKey >= berlinToday ? (");

    expect(monthSource).toContain("mb-2 flex items-center justify-between rounded-md px-1.5 py-1");
    expect(dayNumberIndex).toBeGreaterThan(-1);
    expect(plusGuardIndex).toBeGreaterThan(-1);
    expect(dayNumberIndex).toBeLessThan(plusGuardIndex);
    expect(monthSource).toContain('? "bg-primary/10"');
    expect(monthSource).toContain('? "bg-slate-300/35"');
    expect(monthSource).toContain(': "bg-slate-100/90"');
    expect(monthSource).toContain(': "bg-muted/30"');
  });

  it("guards week create button behind day >= berlinToday", () => {
    expect(weekSource).toContain("const berlinToday = getBerlinTodayDateString();");
    expect(weekSource).toContain("{dayBucket.dateKey >= berlinToday ? (");
    expect(weekSource).toContain("data-testid={`button-new-appointment-week-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}" );
  });

  it("guards month drag start behind non-historical source and lock state", () => {
    expect(monthSource).toContain("const isHistoricalSource = appointment.startDate < berlinToday;");
    expect(monthSource).toContain("const canDrag = !isLocked && !isHistoricalSource;");
    expect(monthSource).toContain("onDragStart={canDrag ? (event) => handleDragStart(event, appointment.id) : undefined}");
    expect(monthSource).toContain("onDragEnd={canDrag ? handleDragEnd : undefined}");
  });

  it("guards week drag start behind non-historical source and lock state", () => {
    expect(weekSource).toContain("const isHistoricalSource = appointment.startDate < berlinToday;");
    expect(weekSource).toContain("const canDragSegment = !isSegmentLocked && !isHistoricalSource;");
    expect(weekSource).toContain("onDragStart={canDragSegment ? (event) => handleDragStart(event, appointment.id) : undefined}");
    expect(weekSource).toContain("onDragEnd={canDragSegment ? handleDragEnd : undefined}");
  });

  it("guards year create button behind day >= berlinToday", () => {
    expect(yearSource).toContain("const berlinToday = getBerlinTodayDateString();");
    expect(yearSource).toContain("{dayKey >= berlinToday ? (");
    expect(yearSource).toContain("data-testid={`button-new-appointment-year-${dayKey}`}" );
  });

  it("does not expose historical creation action in appointment table view", () => {
    expect(listSource).not.toContain("button-new-appointment");
    expect(listSource).not.toContain("onNewAppointment");
    expect(listSource).not.toContain("Termin erstellen");
  });
});
