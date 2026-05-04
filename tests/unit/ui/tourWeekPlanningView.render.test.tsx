/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der neue Tour-KW-View rendert vier KW-Spalten, Tour-Bahnen und KW-Karten aus der API-Projektion.
 * - Mutationsrollen sehen die Kachelaktionen; Readonly-Rollen verlieren die Mitarbeiter- und Blockieraktionen.
 * - Die Notizsteuerung bleibt als Kopffunktion sichtbar.
 *
 * Fehlerfälle:
 * - Die Vier-KW-Matrix wird nicht aufgebaut.
 * - Readonly-Rollen erhalten wieder Mitarbeiter- oder Blockieraktionen.
 * - Der Notizen-Schalter verschwindet aus dem View-Kopf.
 *
 * Ziel:
 * Die neue TourWeekPlanningView-Komponente über beobachtbares Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => false,
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
  EmployeePickerDialogList: () => <section data-testid="employee-picker-marker" />,
}));

vi.mock("@/components/TourWeekCard", () => ({
  TourWeekCard: ({
    actions,
    inlineNotes,
    testId,
  }: {
    actions?: React.ReactNode;
    inlineNotes?: React.ReactNode;
    testId?: string;
  }) => (
    <article data-testid={testId}>
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
  tours: [{ id: 41, name: "Nordtour", color: "#225588" }],
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
  }],
};

describe("TourWeekPlanningView render", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    setSettingMock.mockReset();
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "tourWeekPlanningView") {
        return { data: planningResponse, isLoading: false };
      }
      return { data: [], isLoading: false };
    });
  });

  it("renders the four-week tour planning matrix with mutating actions", () => {
    const html = renderToStaticMarkup(<TourWeekPlanningView />);

    expect(html).toContain("tour-week-planning-view");
    expect(html).toContain("switch-tour-week-planning-inline-notes");
    expect(html).toContain("tour-week-planning-lane-41");
    expect(html).toContain("column-tour-week-planning-2099-6");
    expect(html).toContain("column-tour-week-planning-2099-9");
    expect(html).toContain("tour-week-planning-card-41-2099-6");
    expect(html).toContain("button-tour-week-planning-add-41-2099-6");
    expect(html).toContain("button-tour-week-planning-apply-41-2099-6");
    expect(html).toContain("Wochenplanung blockieren");
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
