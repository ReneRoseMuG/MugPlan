/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarWorkspace rendert im Wochenmodus sichtbar das WeekGrid.
 * - CalendarWorkspace rendert Monatsansichten sichtbar nur noch ueber MonthSheetGrid.
 * - New/Open-Callbacks werden mit dem passenden Rueckkehrkontext weitergereicht.
 *
 * Fehlerfaelle:
 * - Falsches Grid wird fuer die aktive Ansicht gerendert.
 * - Week- und Month-Callbacks verlieren ihren View-Kontext.
 *
 * Ziel:
 * Wrapper-Verhalten fuer Woche und Monat ueber gerenderten Laufzeitkontext absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const weekGridCalls: Array<Record<string, unknown>> = [];
const monthSheetGridCalls: Array<Record<string, unknown>> = [];
const openAppointmentFormMock = vi.fn();

vi.mock("@/components/WeekGrid", () => ({
  WeekGrid: (props: Record<string, unknown>) => {
    weekGridCalls.push(props);
    return <div data-testid="week-grid-marker">week-grid</div>;
  },
}));

vi.mock("@/components/MonthSheetGrid", () => ({
  MonthSheetGrid: (props: Record<string, unknown>) => {
    monthSheetGridCalls.push(props);
    return <div data-testid="month-sheet-grid-marker">month-sheet-grid</div>;
  },
}));

vi.mock("@/components/calendar/CalendarTourPrintPreviewDialog", () => ({
  CalendarTourPrintPreviewDialog: () => <div data-testid="tour-print-dialog-marker">dialog</div>,
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: () => <div data-testid="calendar-filter-panel-marker">filter</div>,
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => 33,
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-01",
}));

vi.mock("@/lib/tour-print-preview", () => ({
  normalizeTourPrintWeekCount: (value: number) => value,
}));

import { CalendarWorkspace } from "../../../client/src/components/CalendarWorkspace";

describe("FT29 UI: calendar workspace week/month wiring", () => {
  beforeEach(() => {
    weekGridCalls.length = 0;
    monthSheetGridCalls.length = 0;
    openAppointmentFormMock.mockReset();
    vi.stubGlobal("React", React);
  });

  it("renders the week grid in week mode and forwards week callbacks with return context", () => {
    const markup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2099-01-07")}
        employeeFilterId={17}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
        projectId={88}
        restoreScrollLeft={144}
        onScrollRestoreApplied={() => undefined}
      />,
    );

    expect(markup).toContain("week-grid-marker");
    expect(markup).not.toContain("month-sheet-grid-marker");

    const props = weekGridCalls.at(-1);
    expect(props?.employeeFilterId).toBe(17);
    expect(props?.restoreScrollLeft).toBe(144);

    (props?.onNewAppointment as (date: string, options?: { tourId?: number | null; scrollLeft?: number | null }) => void)(
      "2099-01-10",
      { tourId: 5, scrollLeft: 220 },
    );
    (props?.onOpenAppointment as (appointmentId: number) => void)(501);

    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(1, {
      initialDate: "2099-01-10",
      initialTourId: 5,
      projectId: 88,
      returnView: "week",
      weekScrollLeft: 220,
    });
    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(2, {
      appointmentId: 501,
      returnView: "week",
    });
  });

  it("renders the month sheet grid in month mode and forwards month callbacks with month return context", () => {
    const markup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="month"
        currentDate={new Date("2099-01-07")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
        projectId={42}
      />,
    );

    expect(markup).toContain("month-sheet-grid-marker");
    expect(markup).not.toContain("week-grid-marker");

    const props = monthSheetGridCalls.at(-1);
    (props?.onNewAppointment as (date: string) => void)("2099-01-12");
    (props?.onOpenAppointment as (appointmentId: number) => void)(601);

    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(1, {
      initialDate: "2099-01-12",
      projectId: 42,
      returnView: "month",
    });
    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(2, {
      appointmentId: 601,
      returnView: "month",
    });
  });

  it("renders the month sheet grid in monthSheet mode and forwards the monthSheet return context", () => {
    const markup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="monthSheet"
        currentDate={new Date("2099-01-07")}
        employeeFilterId={11}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
        projectId={99}
      />,
    );

    expect(markup).toContain("month-sheet-grid-marker");
    expect(markup).not.toContain("week-grid-marker");

    const props = monthSheetGridCalls.at(-1);
    expect(props?.employeeFilterId).toBe(11);

    (props?.onNewAppointment as (date: string, options?: { scrollLeft?: number | null }) => void)(
      "2099-01-20",
      { scrollLeft: 444 },
    );
    (props?.onOpenAppointment as (appointmentId: number, options?: { scrollLeft?: number | null }) => void)(
      701,
      { scrollLeft: 555 },
    );

    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(1, {
      initialDate: "2099-01-20",
      projectId: 99,
      returnView: "monthSheet",
    });
    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(2, {
      appointmentId: 701,
      returnView: "monthSheet",
    });
  });
});
