/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender rendert die Drucksteuerung inline im Kalenderfilter.
 * - CalendarWorkspace reicht die Drucksteuerung nur im Wochenmodus weiter.
 * - Die Druckvorschau erhaelt Tour, Wochenzahl und Startdatum aus dem Workspace-Zustand.
 *
 * Fehlerfaelle:
 * - Die Drucksteuerung faellt in einen separaten Pfad zurueck.
 * - Die Vorschau verliert die verdrahteten Filterwerte aus dem Workspace.
 *
 * Ziel:
 * Sichtbares Print-Preview-Wiring ueber CalendarFilterPanel und CalendarWorkspace absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const setSettingMock = vi.fn();
const toastMock = vi.fn();
const dialogCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: setSettingMock }),
  useSetting: (key: string) => {
    switch (key) {
      case "calendar.weekAppointmentDisplayMode":
        return "standard";
      case "calendar.weekTileBodyMode":
        return "semiexpanded";
      case "calendar.weekLanes.isCollapsed":
        return false;
      case "calendarWeekendColumnPercent":
        return 33;
      default:
        return null;
    }
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div data-testid="calendar-employee-filter">employee-filter</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, ...props }: { children?: React.ReactNode; disabled?: boolean; [key: string]: unknown }) => (
    <button type="button" disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <section data-testid="calendar-filter-panel">{children}</section>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: { children?: React.ReactNode; className?: string }) => <label className={className}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className, ...props }: { children?: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <button type="button" className={className} {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/MonthSheetGrid", () => ({
  MonthSheetGrid: () => <div>month-sheet-grid</div>,
}));

vi.mock("@/components/WeekGrid", () => ({
  WeekGrid: () => <div>week-grid</div>,
}));

vi.mock("@/components/calendar/CalendarTourPrintPreviewDialog", () => ({
  CalendarTourPrintPreviewDialog: (props: Record<string, unknown>) => {
    dialogCalls.push(props);
    return <div data-testid="tour-print-dialog-marker">dialog</div>;
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-02-01",
}));

vi.mock("@/lib/tour-print-preview", () => ({
  normalizeTourPrintWeekCount: (value: number) => value,
}));

import { CalendarWorkspace } from "../../../client/src/components/CalendarWorkspace";
import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

describe("FT31 UI: CalendarWorkspace tour print preview wiring", () => {
  beforeEach(() => {
    dialogCalls.length = 0;
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      data: [{ id: 1, name: "Tour A" }],
    });
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
  });

  it("renders the print controls as one compact block in the calendar filter", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        weekLanesCollapsed={false}
        onWeekLanesCollapsedChange={() => undefined}
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={2}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        printStartNextWeek={false}
        onPrintStartNextWeekChange={() => undefined}
      />,
    );

    expect(html).toContain("Planung drucken");
    expect(html).toContain("Tour");
    expect(html).toContain("Beginn");
    expect(html).toContain("select-tour-print-preview");
    expect(html).toContain("input-tour-print-week-count");
    expect(html).toContain("button-open-tour-print-preview");
    expect(html).toContain("toggle-print-start-current-week");
    expect(html).toContain("toggle-print-start-next-week");
    expect(html).not.toContain("select-week-display-mode");
    expect(html.indexOf("select-tour-print-preview")).toBeLessThan(html.indexOf("input-tour-print-week-count"));
    expect(html.indexOf("input-tour-print-week-count")).toBeLessThan(html.indexOf("button-open-tour-print-preview"));
  });

  it("wires the dialog state from the workspace only for the week footer flow", () => {
    const weekMarkup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="week"
        currentDate={new Date("2099-02-01")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );
    const weekDialogProps = dialogCalls.at(-1);

    const monthMarkup = renderToStaticMarkup(
      <CalendarWorkspace
        mode="global"
        activeView="month"
        currentDate={new Date("2099-02-01")}
        employeeFilterId={null}
        onEmployeeFilterChange={() => undefined}
        onViewChange={() => undefined}
        onDateChange={() => undefined}
        onOpenAppointmentForm={() => undefined}
      />,
    );
    const monthDialogProps = dialogCalls.at(-1);

    expect(weekMarkup).toContain("data-testid=\"calendar-filter-panel\"");
    expect(monthMarkup).toContain("data-testid=\"calendar-filter-panel\"");
    expect(weekDialogProps).toMatchObject({
      tourId: null,
      weekCount: 1,
      fromDate: "2099-01-26",
      weekendColumnPercent: 33,
    });
    expect(monthDialogProps).toMatchObject({
      tourId: null,
      weekCount: 1,
      fromDate: "2099-01-26",
      weekendColumnPercent: 33,
    });
  });
});
