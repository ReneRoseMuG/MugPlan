/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der neue Tour-KW-View rendert vier KW-Spalten, Tour-Bahnen und KW-Karten aus der API-Projektion.
 * - Mutationsrollen sehen die Kachelaktionen; Readonly-Rollen verlieren die Mitarbeiter- und Blockieraktionen.
 *
 * Fehlerfälle:
 * - Die Vier-KW-Matrix wird nicht aufgebaut.
 * - Readonly-Rollen erhalten wieder Mitarbeiter- oder Blockieraktionen.
 *
 * Ziel:
 * Die neue TourWeekPlanningView-Komponente über beobachtbares Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();
const employeePickerCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
  useSettings: () => ({ setSetting: setSettingMock }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/calendar/CalendarWeekNotesButton", () => ({
  CalendarWeekNotesButton: ({ children }: { children: (props: { dialog: React.ReactNode; openDialog: () => void }) => React.ReactNode }) => (
    <>
      {children({ dialog: <div data-testid="notes-dialog-marker" />, openDialog: vi.fn() })}
    </>
  ),
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: (props: Record<string, unknown>) => {
    employeePickerCalls.push(props);
    return <section data-testid="employee-picker-marker" />;
  },
}));

vi.mock("@/components/TourWeekCard", () => ({
  TourWeekCard: ({
    actions,
    hideDateRange,
    inlineNotes,
    testId,
  }: {
    actions?: React.ReactNode;
    hideDateRange?: boolean;
    inlineNotes?: React.ReactNode;
    testId?: string;
  }) => (
    <article data-testid={testId}>
      {hideDateRange ? <span data-testid={`${testId}-date-hidden`} /> : null}
      {actions}
      {inlineNotes}
    </article>
  ),
}));

import { TourWeekPlanningView } from "../../../client/src/components/TourWeekPlanningView";

const planningResponse = {
  weeks: [
    { isoYear: 2099, isoWeek: 6, weekStartDate: "2099-02-02", weekEndDate: "2099-02-08" },
    { isoYear: 2099, isoWeek: 7, weekStartDate: "2099-02-09", weekEndDate: "2099-02-15" },
    { isoYear: 2099, isoWeek: 8, weekStartDate: "2099-02-16", weekEndDate: "2099-02-22" },
    { isoYear: 2099, isoWeek: 9, weekStartDate: "2099-02-23", weekEndDate: "2099-03-01" },
  ],
  tours: [
    { id: 41, name: "Nordtour", color: "#225588" },
    { id: 42, name: "Suedtour", color: "#a855f7" },
  ],
  cells: [{
    tourId: 41,
    tourName: "Nordtour",
    tourColor: "#225588",
    isoYear: 2099,
    isoWeek: 6,
    weekStartDate: "2099-02-02",
    weekEndDate: "2099-02-08",
    isLocked: false,
    isBlocked: false,
    appointmentsCount: 2,
    notesCount: 1,
    employees: [{
      assignmentId: 501,
      employeeId: 9,
      firstName: "Ada",
      lastName: "Plan",
      fullName: "Ada Plan",
    }],
  }, {
    tourId: 42,
    tourName: "Suedtour",
    tourColor: "#a855f7",
    isoYear: 2099,
    isoWeek: 6,
    weekStartDate: "2099-02-02",
    weekEndDate: "2099-02-08",
    isLocked: false,
    isBlocked: false,
    appointmentsCount: 1,
    notesCount: 0,
    employees: [],
  }],
};

describe("TourWeekPlanningView render", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    employeePickerCalls.length = 0;
    useQueryMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();
    useSettingMock.mockImplementation((key: string) => {
      if (key === "tourWeekPlanning.weekLanes.expandedLaneId") return "tour-41";
      if (key === "tourWeekPlanning.weekLanes.isCollapsed") return false;
      return null;
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "tourWeekPlanningView") {
        return { data: planningResponse, isLoading: false };
      }
      if (key === "calendarWeekNotes") {
        return {
          data: [{
            id: 701,
            title: "Kräftige Notiz",
            body: "<p>Bitte beachten</p>",
            cardColor: "#ef4444",
          }],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
  });

  it("renders the four-week tour planning matrix with mutating actions", () => {
    const html = renderToStaticMarkup(<TourWeekPlanningView />);

    expect(html).toContain("tour-week-planning-view");
    expect(html).toContain("tour-week-planning-lane-41");
    expect(html).toContain("column-tour-week-planning-2099-6");
    expect(html).toContain("column-tour-week-planning-2099-9");
    expect(html).toContain("tour-week-planning-card-41-2099-6");
    expect(html).toContain("tour-week-planning-card-41-2099-6-date-hidden");
    expect(html).toContain("button-tour-week-planning-add-41-2099-6");
    expect(html).toContain("button-tour-week-planning-apply-41-2099-6");
    expect(html).toContain("Wochenplanung blockieren");
    expect(employeePickerCalls).toHaveLength(1);
    expect(employeePickerCalls[0]).toMatchObject({
      selectionMode: "multiple",
      viewModeSettingKey: "appointmentEmployeePicker.viewMode",
      title: "Mitarbeiter auswählen",
    });
    expect(employeePickerCalls[0].onSelectEmployee).toEqual(expect.any(Function));
    expect(employeePickerCalls[0].onConfirmSelection).toEqual(expect.any(Function));
  });

  it("renders week notes below the card when enabled", () => {
    const html = renderToStaticMarkup(<TourWeekPlanningView showInlineNotes />);

    expect(html).toContain("tour-week-planning-card-41-2099-6");
    expect(html).toContain("tour-week-planning-below-notes-41-2099-6");
    expect(html.indexOf("tour-week-planning-card-41-2099-6")).toBeLessThan(html.indexOf("tour-week-planning-below-notes-41-2099-6"));
    expect(html).toContain("Kräftige Notiz");
    expect(html).toContain("color:#ffffff");
  });

  it("collapses non-selected tour lanes in collapsed mode", () => {
    const html = renderToStaticMarkup(<TourWeekPlanningView weekLanesCollapsed />);

    expect(html).toContain("tour-week-planning-lane-body-41");
    expect(html).toContain("tour-week-planning-lane-body-42");
    expect(html).toContain("max-h-0 opacity-0");
  });

  it("hides mutating card actions in readonly mode", () => {
    const html = renderToStaticMarkup(<TourWeekPlanningView readOnly />);

    expect(html).toContain("tour-week-planning-card-41-2099-6");
    expect(html).not.toContain("button-tour-week-planning-add-41-2099-6");
    expect(html).not.toContain("button-tour-week-planning-apply-41-2099-6");
    expect(html).not.toContain("Wochenplanung blockieren");
    expect(html).toContain("Notizen anzeigen");
  });
});
