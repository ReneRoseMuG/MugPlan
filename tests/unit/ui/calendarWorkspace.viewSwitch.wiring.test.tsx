/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarWorkspace rendert im Wochenmodus sichtbar das WeekGrid.
 * - CalendarWorkspace rendert Monatsansichten sichtbar nur noch ueber MonthSheetGrid.
 * - New/Open-Callbacks werden mit dem passenden Rueckkehrkontext weitergereicht.
 * - Monitoring-Treffer werden als triggerbezogene Konflikt-Metadaten in Woche und Monat weitergereicht.
 * - Die zentrale Restore-Request-Logik fuer Vor/Zurueck-Navigation uebernimmt die zuletzt gemeldete Week-Viewport-Position nur im Wochenmodus.
 *
 * Fehlerfaelle:
 * - Falsches Grid wird fuer die aktive Ansicht gerendert.
 * - Week- und Month-Callbacks verlieren ihren View-Kontext.
 * - Triggerprioritaet oder Konfliktfarbe gehen auf dem Weg in die Grids verloren.
 * - Wochennavigation startet nach dem Blaettern wieder oben statt die Arbeitsposition zu halten.
 * - Monatsnavigation uebernimmt versehentlich Wochen-Scrollwerte.
 *
 * Ziel:
 * Wrapper-Verhalten fuer Woche und Monat inklusive Rueckkehr- und Navigationskontext absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const weekGridCalls: Array<Record<string, unknown>> = [];
const monthSheetGridCalls: Array<Record<string, unknown>> = [];
const openAppointmentFormMock = vi.fn();
const monitoringItems = [
  {
    appointmentId: 91,
    startDate: "2099-01-07",
    startTime: null,
    tourId: 9,
    tourName: "Tour 9",
    tourColor: "#225588",
    orderNumber: null,
    projectTitle: null,
    projectName: null,
    customerNumber: "1009",
    customerFirstName: "Mia",
    customerLastName: "Monitoring",
    customerName: null,
    employeeCount: 0,
    triggerCode: "TR-01" as const,
    triggerCodes: ["TR-01", "TR-02"] as const,
    triggerName: "Mindestzahl Mitarbeiter + Geparkt",
  },
];

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

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: () => <div data-testid="calendar-filter-panel-marker">filter</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: vi.fn() }),
  useSetting: (key: string) => {
    switch (key) {
      case "calendar.weekTileBodyMode":
        return "collapsed";
      case "calendar.weekLanes.isCollapsed":
        return false;
      default:
        return null;
    }
  },
}));

import { buildWeekNavigationRestoreRequest, CalendarMoveSelectionCard, CalendarWorkspace } from "../../../client/src/components/CalendarWorkspace";

describe("FT29 UI: calendar workspace week/month wiring", () => {
  beforeEach(() => {
    weekGridCalls.length = 0;
    monthSheetGridCalls.length = 0;
    openAppointmentFormMock.mockReset();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
  });

  it("renders the week grid in week mode and forwards week callbacks with return context", () => {
    const markup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2099-01-07")}
        monitoringItems={monitoringItems}
        employeeFilterId={17}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
        projectId={88}
        restoreRequest={{ scrollLeft: 144, scrollTop: 55 }}
        onRestoreApplied={() => undefined}
      />,
    );

    expect(markup).toContain("week-grid-marker");
    expect(markup).not.toContain("month-sheet-grid-marker");

    const props = weekGridCalls.at(-1);
    expect(props?.employeeFilterId).toBe(17);
    expect(props?.restoreRequest).toEqual({ scrollLeft: 144, scrollTop: 55 });
    expect(props?.weekTileBodyMode).toBe("collapsed");
    expect(props?.weekLanesCollapsed).toBe(false);
    expect(props?.selectedMoveAppointment).toBeNull();
    expect(props?.onSelectMoveAppointment).toEqual(expect.any(Function));
    expect(props?.onRequestMoveAppointment).toEqual(expect.any(Function));
    expect(props?.conflictHighlightActive).toBe(false);
    expect(props?.conflictAppointmentMap).toBeInstanceOf(Map);
    expect((props?.conflictAppointmentMap as Map<number, { triggerCode: string; color: string }>).get(91)).toEqual({
      triggerCode: "TR-01",
      triggerName: "Mindestzahl Mitarbeiter",
      color: "#DC2626",
    });

    (props?.onNewAppointment as (date: string, options?: { tourId?: number | null; scrollLeft?: number | null; scrollTop?: number | null }) => void)(
      "2099-01-10",
      { tourId: 5, scrollLeft: 220, scrollTop: 333 },
    );
    (props?.onOpenAppointment as (appointmentId: number, options?: { scrollLeft?: number | null; scrollTop?: number | null }) => void)(
      501,
      { scrollLeft: 111, scrollTop: 222 },
    );

    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(1, {
      initialDate: "2099-01-10",
      initialTourId: 5,
      projectId: 88,
      returnView: "week",
      weekScrollLeft: 220,
      weekScrollTop: 333,
    });
    expect(openAppointmentFormMock).toHaveBeenNthCalledWith(2, {
      appointmentId: 501,
      returnView: "week",
      weekScrollLeft: 111,
      weekScrollTop: 222,
    });
  });

  it("builds a restore request from the last reported viewport only in week mode", () => {
    expect(buildWeekNavigationRestoreRequest("week", {
      scrollLeft: 321,
      scrollTop: 654,
    })).toEqual({
      scrollLeft: 321,
      scrollTop: 654,
    });

    expect(buildWeekNavigationRestoreRequest("month", {
      scrollLeft: 321,
      scrollTop: 654,
    })).toBeNull();

    expect(buildWeekNavigationRestoreRequest("week", null)).toBeNull();
  });

  it("renders the month sheet grid in month mode and forwards month callbacks with month return context", () => {
    const markup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="month"
        currentDate={new Date("2099-01-07")}
        monitoringItems={monitoringItems}
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
    expect(markup).not.toContain("calendar-month-navigation");

    const props = monthSheetGridCalls.at(-1);
    expect(props?.visibleWeekCount).toBe(6);
    expect(props?.showMonthHeader).toBe(true);
    expect(props?.headerAction).toBeTruthy();
    expect(props?.selectedMoveAppointment).toBeNull();
    expect(props?.onSelectMoveAppointment).toEqual(expect.any(Function));
    expect(props?.onRequestMoveAppointment).toEqual(expect.any(Function));
    expect(props?.onPreviousWeek).toEqual(expect.any(Function));
    expect(props?.onNextWeek).toEqual(expect.any(Function));
    expect(markup).not.toContain("calendar-absence-mode-toggle");
    expect((props?.conflictAppointmentMap as Map<number, { triggerCode: string }>).get(91)?.triggerCode).toBe("TR-01");
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
        monitoringItems={monitoringItems}
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

  it("keeps week and month sheet calendars readonly for reader roles", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2099-01-07")}
        monitoringItems={monitoringItems}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
      />,
    );

    renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="monthSheet"
        currentDate={new Date("2099-01-07")}
        monitoringItems={monitoringItems}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={openAppointmentFormMock}
      />,
    );

    const weekProps = weekGridCalls.at(-1);
    const monthSheetProps = monthSheetGridCalls.at(-1);

    expect(weekProps?.readOnly).toBe(true);
    expect(weekProps?.onNewAppointment).toBeUndefined();
    expect(weekProps?.onSelectMoveAppointment).toBeUndefined();
    expect(weekProps?.onRequestMoveAppointment).toBeUndefined();
    expect(monthSheetProps?.readOnly).toBe(true);
    expect(monthSheetProps?.onNewAppointment).toBeUndefined();
    expect(monthSheetProps?.onSelectMoveAppointment).toBeUndefined();
    expect(monthSheetProps?.onRequestMoveAppointment).toBeUndefined();
  });

  it("renders a prominent selected move appointment card with clear action", () => {
    const markup = renderToStaticMarkup(
      <CalendarMoveSelectionCard
        selection={{
          id: 77,
          version: 2,
          projectId: 99,
          projectName: "A-08 Projekt",
          customerId: 33,
          customerName: "Meisel Testkunde",
          customerNumber: "K-33",
          startDate: "2099-01-12",
          endDate: null,
          startTime: null,
          tourId: 5,
          tourName: "Tour Alpha",
          employeeIds: [1, 2],
          isCancelled: false,
          isLocked: false,
        }}
        onClear={() => undefined}
      />,
    );

    expect(markup).toContain("calendar-move-selection-card");
    expect(markup).toContain("Termin zum Verschieben selektiert");
    expect(markup).toContain("A-08 Projekt");
    expect(markup).toContain("12.01.99");
    expect(markup).toContain("button-clear-calendar-move-selection");
  });
});
