/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourEditForm bindet die eingebettete Terminliste mit Tour-Kontext und dem tour-spezifischen helpKey an.
 * - Die terminbasierte Mitarbeiterabfrage blockiert die Terminlisten-Verdrahtung nicht.
 * - Das Tourformular rendert im neuen Shell-Layout die leere Sidebar-Spalte.
 * - Veraltete Legacy-Props werden nicht mehr an die Terminliste weitergereicht.
 *
 * Fehlerfaelle:
 * - Die Terminliste verliert ihren Tour-Kontext oder den spezifischen helpKey.
 * - Der leere Neuanlagezustand verschwindet aus dem Formular oder landet ausserhalb des Hauptbereichs.
 * - Die Shell verliert die vorgesehene Sidebar-Spalte wieder.
 * - Alte Prop-Pfade tauchen wieder an der Terminliste auf.
 *
 * Ziel:
 * Die TourEditForm-Terminlistenverdrahtung und die Shell-Einbettung ueber gerenderte Props statt ueber Dateiinhaltspruefungen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const entityFormShellCalls: Array<Record<string, unknown>> = [];
const appointmentsListPageCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();

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
  EntityFormShell: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    entityFormShellCalls.push(props);
    return (
      <section data-testid="tour-entity-form-shell">
        {props.header ? <div data-testid="entity-form-shell-header">{props.header as React.ReactNode}</div> : null}
        <div data-testid="entity-form-shell-main">{props.children}</div>
        {props.sidebar ? <div data-testid="entity-form-shell-sidebar">{props.sidebar as React.ReactNode}</div> : null}
        <div data-testid="entity-form-shell-footer">{props.footer as React.ReactNode}</div>
      </section>
    );
  },
}));

vi.mock("@/components/ui/color-select-button", () => ({
  ColorSelectButton: ({ testId }: { testId?: string }) => <button type="button" data-testid={testId}>farbe</button>,
}));

vi.mock("@/components/ui/members-section-header", () => ({
  MembersSectionHeader: ({ action }: { action?: React.ReactNode }) => (
    <div>
      members
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
  AppointmentsListPage: (props: Record<string, unknown>) => {
    appointmentsListPageCalls.push(props);
    return (
      <section data-testid="appointments-list-page">
        {props.emptyStateOverride as React.ReactNode}
      </section>
    );
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
  Tabs: ({ children, className, ...props }: { children?: React.ReactNode; className?: string; [key: string]: unknown }) => <div className={className} {...props}>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: () => <div>employee-picker</div>,
}));

import { TourEditForm } from "../../../client/src/components/TourEditForm";

describe("FT04 TourEditForm appointments list behavior", () => {
  const noop = async () => undefined;

  beforeEach(() => {
    vi.stubGlobal("React", React);
    entityFormShellCalls.length = 0;
    appointmentsListPageCalls.length = 0;
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tours/12/employees/active") {
        return {
          data: [
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

  it("passes the tour context, help key and empty state into the embedded appointments list", () => {
    const html = renderToStaticMarkup(
      <TourEditForm
        tour={null}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        isCreate
        defaultName="Neue Tour"
        defaultColor="#225577"
        onCancel={() => undefined}
      />,
    );

    expect(entityFormShellCalls[0]?.sidebar).toBeTruthy();
    expect(appointmentsListPageCalls[0]).toMatchObject({
      title: "Termine",
      helpKey: "appointments.list.tourForm",
      context: { type: "tour", tourId: null },
      className: "min-h-0 flex-1",
    });
    expect(appointmentsListPageCalls[0]).not.toHaveProperty("hideTourFilter");
    expect(appointmentsListPageCalls[0]).not.toHaveProperty("lockedTourId");
    expect(appointmentsListPageCalls[0]).not.toHaveProperty("hideTourColumn");
    expect(appointmentsListPageCalls[0]).not.toHaveProperty("enforceFromToday");
    expect(html).toContain("entity-form-shell-header");
    expect(html).toContain("tour-form-main-column");
    expect(html).toContain("entity-form-shell-footer");
    expect(html).toContain("entity-form-shell-sidebar");
    expect(html).not.toContain("Nach dem Speichern der Tour werden Termine angezeigt.");
  });

  it("keeps the appointments list bound to the edited tour id and forwards open handlers", () => {
    const onOpenAppointment = vi.fn();

    renderToStaticMarkup(
      <TourEditForm
        tour={{
          id: 12,
          name: "Nordtour",
          color: "#335577",
          version: 4,
        }}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
        onOpenAppointment={onOpenAppointment}
      />,
    );

    expect(appointmentsListPageCalls[0]).toMatchObject({
      context: { type: "tour", tourId: 12 },
      onOpenAppointment,
    });
  });
});
