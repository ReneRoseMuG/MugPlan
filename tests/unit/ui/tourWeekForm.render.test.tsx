/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourWeekForm rendert Tabs, Sidebar-Notizen und KW-fixierte Terminliste im gemeinsamen Shell-Layout.
 * - Im Tour-Scope bleibt der Mitarbeiter-Picker verdrahtet und bietet Einzel- sowie Mehrfachuebernahme.
 * - Im Mitarbeiter-Scope bleibt die Mitarbeiterliste read-only und die Terminliste auf den Mitarbeiterkontext fixiert.
 *
 * Fehlerfaelle:
 * - Das Wochenformular verliert Tabs, Notiz-Sidebar oder den fixen KW-Terminfilter.
 * - Der Mitarbeiter-Picker ist im Tour-Scope nicht mehr vollstaendig verdrahtet.
 * - Der Mitarbeiter-Scope rendert weiterhin editierbare Picker-Aktionen.
 *
 * Ziel:
 * Das gemeinsame tour_week-Formular ueber sichtbare Struktur und zentrale Prop-Verdrahtung regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const employeePickerCalls: Array<Record<string, unknown>> = [];
const appointmentsListCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => {
      useMutationMock(options);
      return { mutate: vi.fn(), mutateAsync: vi.fn(async () => ({})), isPending: false };
    },
    useQueryClient: () => ({
      invalidateQueries: vi.fn(async () => undefined),
    }),
  };
});

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: ({
    children,
    sidebar,
    header,
    footer,
  }: {
    children?: React.ReactNode;
    sidebar?: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div data-testid="entity-form-shell">
      {header ? <div data-testid="entity-form-shell-header">{header}</div> : null}
      <div data-testid="entity-form-shell-main">{children}</div>
      {sidebar ? <div data-testid="entity-form-shell-sidebar">{sidebar}</div> : null}
      {footer ? <div data-testid="entity-form-shell-footer">{footer}</div> : null}
    </div>
  ),
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: ({ title, notes }: { title?: string; notes?: Array<{ title: string }> }) => (
    <section data-testid="tour-week-notes-marker">
      {title}
      {notes?.map((note) => <div key={note.title}>{note.title}</div>)}
    </section>
  ),
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: (props: Record<string, unknown>) => {
    appointmentsListCalls.push(props);
    return <section data-testid="tour-week-appointments-marker">appointments</section>;
  },
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: (props: Record<string, unknown>) => {
    employeePickerCalls.push(props);
    return <section data-testid="tour-week-employee-picker-marker">picker</section>;
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName?: string; testId?: string }) => (
    <div data-testid={testId}>{fullName}</div>
  ),
}));

vi.mock("@/components/ui/edit-form-context-text", () => ({
  EditFormContextText: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/lib/tour-week-queries", () => ({
  invalidateTourWeekQueries: vi.fn(async () => undefined),
}));

import { TourWeekForm } from "../../../client/src/components/TourWeekForm";

const baseWeek = {
  assignmentId: 91,
  tourId: 7,
  tourName: "Tour Nord",
  tourColor: "#225588",
  isoYear: 2026,
  isoWeek: 18,
  weekStartDate: "2026-04-27",
  weekEndDate: "2026-05-03",
  isLocked: false,
  isBlocked: false,
  appointmentsCount: 2,
  notesCount: 1,
  employees: [
    { assignmentId: 91, employeeId: 17, fullName: "Mitarbeiter, Mia" },
    { assignmentId: 92, employeeId: 22, fullName: "Kollege, Kai" },
  ],
};

describe("tourWeekForm render", () => {
  beforeEach(() => {
    employeePickerCalls.length = 0;
    appointmentsListCalls.length = 0;
    useMutationMock.mockReset();
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === `/api/tours/${baseWeek.tourId}/week-employees`) {
        return { data: baseWeek, isLoading: false };
      }
      if (
        Array.isArray(queryKey)
        && queryKey[0] === "/api/employees"
        && queryKey[1] === 17
        && queryKey[2] === "week-plans"
      ) {
        return { data: baseWeek, isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === "/api/teams") {
        return { data: [{ id: 4, name: "Team Nord", color: "#112233" }], isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === `/api/tours/${baseWeek.tourId}/week-employees/available`) {
        return {
          data: [
            { id: 31, firstName: "Neue", lastName: "Kollegin", fullName: "Kollegin, Neue", email: null, phone: null, isActive: true, teamId: 4, version: 1 },
          ],
          isLoading: false,
        };
      }
      if (Array.isArray(queryKey) && queryKey[0] === "calendarWeekNotes") {
        return { data: [{ id: 51, title: "Wochennotiz", body: "<p>KW</p>" }], isLoading: false };
      }
      return { data: [], isLoading: false };
    });
  });

  it("renders the tour scope with notes sidebar, tabs and employee picker wiring", () => {
    const markup = renderToStaticMarkup(
      <TourWeekForm
        week={baseWeek}
        scope="tour"
        onClose={() => undefined}
        onAddWeekEmployees={async () => undefined}
        onRemoveWeekEmployee={async () => undefined}
        onBlockWeek={async () => undefined}
        onUnblockWeek={async () => undefined}
      />,
    );

    expect(markup).toContain("tour-week-form-overlay");
    expect(markup).toContain("tab-tour-week-stammdaten");
    expect(markup).toContain("tab-tour-week-termine");
    expect(markup).toContain("tour-week-notes-marker");
    expect(markup).toContain("Wochennotiz");
    expect(markup).toContain("button-open-tour-week-employee-picker");
    expect(markup).toContain("button-block-tour-week");
    expect(markup).toContain("badge-tour-week-form-member-91");
    expect(markup).toContain("27.04.26 - 03.05.26");

    expect(employeePickerCalls).toHaveLength(1);
    expect(employeePickerCalls[0]).toMatchObject({
      allowBulkSelection: true,
      viewModeSettingKey: "appointmentEmployeePicker.viewMode",
      title: "Mitarbeiter auswählen",
    });
    expect(employeePickerCalls[0].onSelectEmployee).toEqual(expect.any(Function));
    expect(employeePickerCalls[0].onConfirmSelection).toEqual(expect.any(Function));

    expect(appointmentsListCalls).toHaveLength(1);
    expect(appointmentsListCalls[0]).toMatchObject({
      context: { type: "tour", tourId: baseWeek.tourId },
      fixedDateRange: {
        dateFrom: baseWeek.weekStartDate,
        dateTo: baseWeek.weekEndDate,
      },
    });
  });

  it("keeps the employee scope read-only while preserving week-fixed employee appointments", () => {
    const markup = renderToStaticMarkup(
      <TourWeekForm
        week={baseWeek}
        scope="employee"
        employeeId={17}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("Tour Nord");
    expect(markup).toContain("tour-week-notes-marker");
    expect(markup).not.toContain("button-open-tour-week-employee-picker");
    expect(markup).not.toContain("button-block-tour-week");
    expect(markup).toContain("badge-tour-week-form-member-91");

    expect(appointmentsListCalls).toHaveLength(1);
    expect(appointmentsListCalls[0]).toMatchObject({
      context: { type: "employee", employeeId: 17 },
      fixedDateRange: {
        dateFrom: baseWeek.weekStartDate,
        dateTo: baseWeek.weekEndDate,
      },
    });
  });
});
