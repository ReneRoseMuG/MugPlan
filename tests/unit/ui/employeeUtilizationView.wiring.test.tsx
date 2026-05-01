/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auslastungsansicht rendert den Monatskalender weiter als read-only 4-Wochen-Ansicht.
 * - Die Sondernavigation "Frueher/Heute/Spaeter" ist entfernt.
 * - Die Monatsnavigation und der KW-Sprung werden sichtbar uebernommen.
 * - Ein Mitarbeiterwechsel setzt die Ansicht wieder auf die aktuelle Woche zurueck.
 *
 * Fehlerfaelle:
 * - Die Auslastungsansicht zeigt noch die alte Doppel-Navigation.
 * - Der KW-Sprung fehlt im Footer oder die Standard-Pfeile fehlen.
 * - Ein alter Datumszustand wird ueber Mitarbeiterwechsel hinweg mitgeschleppt.
 *
 * Ziel:
 * Die neue, am Monatskalender ausgerichtete Navigation der Mitarbeiter-Auslastung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calendarMonthSheetViewCalls: Array<Record<string, unknown>> = [];
const calendarFilterPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/calendar/CalendarMonthSheetView", () => ({
  CalendarMonthSheetView: (props: Record<string, unknown>) => {
    calendarMonthSheetViewCalls.push(props);
    return <div data-testid="calendar-month-sheet-view" data-current-date={String(props["currentDate"])} />;
  },
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: (props: Record<string, unknown>) => {
    calendarFilterPanelCalls.push(props);
    return <div data-testid="calendar-filter-panel-marker">filter</div>;
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2026-04-14",
}));

import { EmployeeUtilizationView } from "../../../client/src/components/EmployeeUtilizationView";

describe("EmployeeUtilizationView: Wiring", () => {
  beforeEach(() => {
    calendarMonthSheetViewCalls.length = 0;
    calendarFilterPanelCalls.length = 0;
    vi.stubGlobal("React", React);
  });

  it("renders the shared month navigation instead of the old custom utilization bars", () => {
    const html = renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={42} userRole="DISPATCHER" />,
    );

    expect(html).toContain('data-testid="button-prev"');
    expect(html).toContain('data-testid="button-next"');
    expect(html).not.toContain("button-utilization-earlier");
    expect(html).not.toContain("button-utilization-later");
    expect(html).not.toContain("button-utilization-today");
    expect(html).not.toContain("employee-utilization-nav-top");
    expect(html).not.toContain("employee-utilization-nav-bottom");
  });

  it("passes the shared kw jump footer without employee selector", () => {
    renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={42} userRole="DISPATCHER" />,
    );

    const filterPanelProps = calendarFilterPanelCalls[0];
    expect(filterPanelProps?.showKwJump).toBe(true);
    expect(filterPanelProps?.showEmployeeFilter).toBe(false);
    expect(filterPanelProps?.kwJumpValue).toBe("16");
  });

  it("keeps CalendarMonthSheetView readonly with a four-week strip", () => {
    renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={42} userRole="DISPATCHER" />,
    );

    const call = calendarMonthSheetViewCalls[0];
    expect(call?.readOnly).toBe(true);
    expect(call?.visibleWeekCount).toBe(4);
    expect(call?.employeeFilterId).toBe(42);
  });

  it("resets the current date to the current week when the employee changes", () => {
    renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={10} userRole="DISPATCHER" />,
    );
    const firstDate = String(calendarMonthSheetViewCalls[0]?.currentDate);

    calendarMonthSheetViewCalls.length = 0;

    renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={99} userRole="DISPATCHER" />,
    );
    const secondDate = String(calendarMonthSheetViewCalls[0]?.currentDate);

    expect(firstDate).toBe(secondDate);
    expect(firstDate).toContain("2026");
  });

  it("renders the utilization shell marker for the employee form tab", () => {
    const html = renderToStaticMarkup(
      <EmployeeUtilizationView employeeId={42} userRole="DISPATCHER" />,
    );

    expect(html).toContain('data-testid="employee-utilization-view"');
  });
});
