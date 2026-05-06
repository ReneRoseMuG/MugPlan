/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourEditForm rendert im EntityFormShell-Layout Header, Hauptbereich, Sidebar und Footer.
 * - Im Create-Modus bleiben Tabs, Farbauswahl und Footer sichtbar, aber kein Mitgliederbereich.
 * - Im Edit-Modus bleibt die Delete-Aktion erhalten und bestehende Wochenplanung wird ueber die Abfrage gerendert.
 * - Der Wochenplan-Mitarbeiterpicker bleibt im Tourformular als bulk-faehiger Listen-/Board-Picker verdrahtet.
 * - Fachlich nicht planbare System-Touren zeigen keinen Wochenplanungs-Tab.
 * - Tabs und Stammdatenbereich bleiben im Hauptformular gleich breit.
 *
 * Fehlerfaelle:
 * - Das Tourformular verliert die erwartete Sidebar oder rendert die Shell-Struktur unvollständig.
 * - Erwartete Tour-Elemente wie Tabs, Save/Cancel oder Wochenplanung verschwinden nach dem Shell-Umbau.
 * - Die Delete-Aktion geht im Edit-Modus verloren.
 * - Der KW-Picker verliert die Listenansicht oder die Sammelauswahl-Verdrahtung.
 * - Fachlich nicht planbare System-Touren wirken mit leerer Wochenliste wie ein Lade- oder Datenfehler.
 * - Der Stammdatenbereich wird schmaler als die Tab-Leiste gerendert.
 *
 * Ziel:
 * Das neue Shell-Layout des Tourformulars inklusive sichtbarer Wochenplan-Verdrahtung regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const employeePickerCalls: Array<Record<string, unknown>> = [];
const journalRecordsCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
  };
});

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => 960,
}));

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
      <div data-testid="entity-form-shell-footer">{footer}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/color-select-button", () => ({
  ColorSelectButton: ({ testId }: { testId?: string }) => <button type="button" data-testid={testId}>farbe</button>,
}));

vi.mock("@/components/ui/members-section-header", () => ({
  MembersSectionHeader: ({ action }: { action?: React.ReactNode }) => (
    <div data-testid="tour-members-section-header">
      mitglieder
      {action}
    </div>
  ),
}));

vi.mock("@/components/ui/plus-action-button", () => ({
  PlusActionButton: (props: Record<string, unknown>) => <button type="button" {...props}>plus</button>,
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ testId }: { testId?: string }) => <div data-testid={testId}>member</div>,
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: ({ emptyStateOverride }: { emptyStateOverride?: React.ReactNode }) => (
    <section data-testid="tour-appointments-list-marker">
      appointments
      {emptyStateOverride}
    </section>
  ),
}));

vi.mock("@/components/TourWeekAppointmentsHoverPreview", () => ({
  TourWeekAppointmentsHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>appointments-{count}</div>
  ),
}));

vi.mock("@/components/TourWeekNotesHoverPreview", () => ({
  TourWeekNotesHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>notes-{count}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogCancel: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/toggle", () => ({
  Toggle: ({ children, pressed, ...props }: { children?: React.ReactNode; pressed?: boolean; [key: string]: unknown }) => (
    <button type="button" data-state={pressed ? "on" : "off"} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: (props: Record<string, unknown>) => {
    employeePickerCalls.push(props);
    return <div>employee-picker</div>;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/components/JournalRecordsView", () => ({
  JournalRecordsView: (props: Record<string, unknown>) => {
    journalRecordsCalls.push(props);
    return <section data-testid="tour-journal-marker">journal</section>;
  },
}));

import { TourEditForm } from "../../../client/src/components/TourEditForm";

const tourFixture = {
  id: 12,
  name: "Nordtour",
  color: "#335577",
  version: 4,
};

describe("FT04 tour form shell layout integration", () => {
  const noop = async (..._args: unknown[]) => undefined;

  beforeEach(() => {
    employeePickerCalls.length = 0;
    journalRecordsCalls.length = 0;
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tours/12/week-employees") {
        return {
          data: [
            {
              tourId: 12,
              tourName: "Nordtour",
              tourColor: "#335577",
              isoYear: 2099,
              isoWeek: 6,
              weekStartDate: "2099-02-02",
              weekEndDate: "2099-02-08",
              isLocked: false,
              isBlocked: false,
              appointmentsCount: 2,
              notesCount: 1,
              employees: [
                {
                  assignmentId: 301,
                  employeeId: 21,
                  fullName: "Muster, Mia",
                },
              ],
            },
          ],
          isLoading: false,
        };
      }

      return {
        data: [],
        isLoading: false,
      };
    });
  });

  it("renders the expected create elements in shell mode with the sidebar", () => {
    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={null}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        isCreate
        defaultName="Neue Tour"
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("entity-form-shell-header");
    expect(markup).toContain("tour-form-main-column");
    expect(markup).toContain("entity-form-shell-footer");
    expect(markup).toContain("entity-form-shell-sidebar");
    expect(markup).toContain("tour-form-sidebar");
    expect(markup).not.toContain("tour-form-functions-panel");
    expect(markup).not.toContain("tabs-tour-main");
    expect(markup).not.toContain("tab-tour-journal");
    expect(markup).toContain("button-close-tour");
    expect(markup).toContain("button-cancel-tour");
    expect(markup).toContain("button-save-tour");
    expect(markup).not.toContain("button-delete-tour-form");
    expect(markup).toContain("tab-tour-stammdaten");
    expect(markup).toContain("tab-tour-termine");
    expect(markup).toContain("input-tour-name");
    expect(markup).toContain("text-tour-generated-name-hint");
    expect(markup).toContain("Neue Tour");
    expect(markup).toContain("button-tour-color-picker");
    expect(markup).not.toContain("button-add-tour-member");
    expect(markup).not.toContain("tour-members-section-header");
    expect(markup).not.toContain("Keine Mitarbeiter zugewiesen");
    expect(markup).toContain("tour-appointments-list-marker");
  });

  it("keeps delete and existing week planning cards visible in edit mode", () => {
    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[
          {
            id: 21,
            firstName: "Mia",
            lastName: "Muster",
            fullName: "Muster, Mia",
            email: null,
            phone: null,
            isActive: true,
            teamId: null,
            version: 1,
          },
        ]}
        onSubmit={noop}
        onDelete={noop}
        canDelete
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("entity-form-shell-sidebar");
    expect(markup).toContain("tour-form-sidebar");
    expect(markup).toContain("tabs-tour-main");
    expect(markup).toContain("tab-tour-details-main");
    expect(markup).toContain("tab-tour-journal");
    expect(markup).toContain("tour-form-functions-panel");
    expect(markup).toContain("button-delete-tour-form");
    expect(markup).not.toContain("toggle-tour-week-picker");
    expect(markup).toContain("input-tour-name");
    expect(markup).toContain("Nordtour");
    expect(markup).not.toContain("text-tour-generated-name-hint");
    expect(markup).toContain("tab-tour-wochenplanung");
    expect(markup).toContain("card-tour-week-2099-6");
    expect(markup).toContain("button-add-tour-week-member-2099-6");
    expect(markup).toContain("button-apply-tour-week-member-2099-6");
    expect(markup).toContain("badge-tour-week-member-301");
    expect(markup).toContain("text-tour-week-dialog-title");
    expect(markup).toContain("text-tour-week-dialog-year");
    expect(markup).toContain("input-tour-week");
    expect(markup).toContain('data-testid="tour-form-main-column"');
    expect(markup).toContain('class="w-full"');
    expect(markup).not.toContain("button-add-tour-week-footer");
    expect(journalRecordsCalls).toHaveLength(0);
  });

  it("hides the week planning tab for Parkplatz", () => {
    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={{ ...tourFixture, name: "Parkplatz" }}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).not.toContain("tab-tour-wochenplanung");
    expect(markup).not.toContain("panel-tour-week-planning-unsupported");
    expect(markup).not.toContain("text-tour-week-planning-unsupported");
    expect(markup).not.toContain("card-tour-week-2099-6");
    expect(markup).not.toContain("button-add-tour-week-member-2099-6");
    expect(markup).not.toContain("button-tour-week-menu-2099-6");
    expect(markup).not.toContain("toggle-tour-week-picker");
  });

  it("hides the week planning tab for Abwesenheiten", () => {
    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={{ ...tourFixture, name: "Abwesenheiten" }}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).not.toContain("tab-tour-wochenplanung");
    expect(markup).not.toContain("grid-tour-week-planning");
    expect(markup).not.toContain("card-tour-week-2099-6");
    expect(markup).not.toContain("toggle-tour-week-picker");
  });

  it("keeps the week employee picker wired for bulk list selection", () => {
    renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        onAddWeekEmployee={noop}
        onAddWeekEmployees={async () => undefined}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(employeePickerCalls).toHaveLength(1);
    expect(employeePickerCalls[0]).toMatchObject({
      allowBulkSelection: true,
      viewModeSettingKey: "appointmentEmployeePicker.viewMode",
    });
    expect(employeePickerCalls[0].onSelectEmployee).toEqual(expect.any(Function));
    expect(employeePickerCalls[0].onConfirmSelection).toEqual(expect.any(Function));
  });

  it("keeps the tour week apply action visible but disabled for empty editable weeks", () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tours/12/week-employees") {
        return {
          data: [
            {
              tourId: 12,
              tourName: "Nordtour",
              tourColor: "#335577",
              isoYear: 2099,
              isoWeek: 8,
              weekStartDate: "2099-02-16",
              weekEndDate: "2099-02-22",
              isLocked: false,
              isBlocked: false,
              appointmentsCount: 0,
              notesCount: 0,
              employees: [],
            },
          ],
          isLoading: false,
        };
      }

      return {
        data: [],
        isLoading: false,
      };
    });

    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("button-apply-tour-week-member-2099-8");
    expect(markup).toMatch(/<button(?=[^>]*data-testid="button-apply-tour-week-member-2099-8")(?=[^>]*disabled)/);
  });

  it("shows the corrected blocked week notice in edit mode", () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tours/12/week-employees") {
        return {
          data: [
            {
              tourId: 12,
              tourName: "Nordtour",
              tourColor: "#335577",
              isoYear: 2099,
              isoWeek: 7,
              weekStartDate: "2099-02-09",
              weekEndDate: "2099-02-15",
              isLocked: false,
              isBlocked: true,
              appointmentsCount: 0,
              notesCount: 1,
              employees: [
                {
                  assignmentId: 302,
                  employeeId: 22,
                  fullName: "Beispiel, Ben",
                },
              ],
            },
          ],
          isLoading: false,
        };
      }

      return {
        data: [],
        isLoading: false,
      };
    });

    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("text-tour-week-blocked-2099-7");
    expect(markup).toContain("Termine dieser Woche wurden auf Parkplatz verschoben");
    expect(markup).not.toContain("button-apply-tour-week-member-2099-7");
    expect(markup).not.toContain("Mitarbeiter bleiben sichtbar");
  });

  it("renders edit mode as readonly for reader roles", () => {
    const markup = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        readOnly
        onCancel={() => undefined}
      />,
    );

    expect(markup).not.toContain("tour-readonly-alert");
    expect(markup).not.toContain("button-save-tour");
    expect(markup).not.toContain("tour-form-functions-panel");
    expect(markup).not.toContain("toggle-tour-week-picker");
    expect(markup).not.toContain("button-add-tour-week-member-2099-6");
    expect(markup).not.toContain("button-tour-week-menu-2099-6");
  });

});
