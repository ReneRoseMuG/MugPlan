/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die KW-Eingabe im CalendarWorkspace ist im Wochenmodus mit der sichtbaren ISO-KW vorbelegt.
 * - Aenderungen des sichtbaren Datums aktualisieren die KW-Eingabe.
 * - Monatsansichten reichen keine KW-Sprungsteuerung weiter.
 *
 * Fehlerfaelle:
 * - Die KW-Anzeige bleibt auf einem alten Wert stehen.
 * - Die Wochenansicht verliert die KW-Vorbelegung.
 * - Monatsansichten erhalten versehentlich KW-Steuerung.
 *
 * Ziel:
 * Die sichtbare KW-Synchronisation zwischen CalendarWorkspace und Filter-Panel absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const filterPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/WeekGrid", () => ({
  WeekGrid: () => <div data-testid="week-grid-marker">week-grid</div>,
}));

vi.mock("@/components/MonthSheetGrid", () => ({
  MonthSheetGrid: () => <div data-testid="month-grid-marker">month-grid</div>,
}));

vi.mock("@/components/calendar/CalendarTourPrintPreviewDialog", () => ({
  CalendarTourPrintPreviewDialog: () => <div data-testid="tour-print-dialog-marker">dialog</div>,
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: (props: Record<string, unknown>) => {
    filterPanelCalls.push(props);
    return <div data-testid="calendar-filter-panel-marker">filter</div>;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: vi.fn() }),
  useSetting: (key: string) => {
    switch (key) {
      case "calendar.weekAppointmentDisplayMode":
        return "standard";
      case "calendar.weekLanes.isCollapsed":
        return false;
      case "calendarWeekendColumnPercent":
        return 33;
      default:
        return null;
    }
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-01",
}));

vi.mock("@/lib/tour-print-preview", () => ({
  normalizeTourPrintWeekCount: (value: number) => value,
}));

import { CalendarWorkspace } from "../../../client/src/components/CalendarWorkspace";

describe("CalendarWorkspace - kw sync wiring", () => {
  beforeEach(() => {
    filterPanelCalls.length = 0;
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
  });

  it("preloads the current iso week into the kw input in week mode", () => {
    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2026-03-30T00:00:00Z")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );

    expect(filterPanelCalls.at(-1)?.kwJumpValue).toBe("14");
    expect(filterPanelCalls.at(-1)?.weekAppointmentDisplayMode).toBeUndefined();
    expect(filterPanelCalls.at(-1)?.weekLanesCollapsed).toBe(false);
  });

  it("updates the kw input when the visible week changes", () => {
    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2026-03-30T00:00:00Z")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );

    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2026-04-06T00:00:00Z")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );

    expect(filterPanelCalls.at(-1)?.kwJumpValue).toBe("15");
  });

  it("does not pass kw jump controls in month mode", () => {
    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="month"
        currentDate={new Date("2026-03-30T00:00:00Z")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );

    expect(filterPanelCalls.at(-1)?.showKwJump).toBe(false);
    expect(filterPanelCalls.at(-1)?.kwJumpValue).toBe("");
  });

});
