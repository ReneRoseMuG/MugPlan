/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourEditForm rendert im EntityFormShell-Layout Header, Hauptbereich und Footer ohne Sidebar.
 * - Im Create-Modus bleiben Tabs, Farbauswahl und Footer sichtbar, aber kein Mitgliederbereich.
 * - Im Edit-Modus bleibt die Delete-Aktion erhalten und aktive Tourmitarbeiter werden ueber die Abfrage gerendert.
 * - Tabs und Stammdatenbereich bleiben im Hauptformular gleich breit.
 *
 * Fehlerfaelle:
 * - Das Tourformular bleibt am alten Layout haengen oder rendert versehentlich eine leere Sidebar.
 * - Erwartete Tour-Elemente wie Tabs, Save/Cancel oder Mitgliederbereich verschwinden nach dem Shell-Umbau.
 * - Die Delete-Aktion geht im Edit-Modus verloren.
 * - Der Stammdatenbereich wird schmaler als die Tab-Leiste gerendert.
 *
 * Ziel:
 * Das neue Shell-Layout des Tourformulars ueber sichtbare Struktur, Breite und die erwarteten Kernelemente regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: () => <div>employee-picker</div>,
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

  it("renders the expected create elements in shell mode without a sidebar", () => {
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
    expect(markup).not.toContain("entity-form-shell-sidebar");
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

  it("keeps delete and existing member badges visible in edit mode", () => {
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
    expect(markup).not.toContain("entity-form-shell-sidebar");
    expect(markup).toContain("button-delete-tour-form");
    expect(markup).toContain("input-tour-name");
    expect(markup).toContain("Nordtour");
    expect(markup).not.toContain("text-tour-generated-name-hint");
    expect(markup).not.toContain("Bestehende Touren aendern Mitarbeiter nur ueber explizites Hinzufuegen oder Abziehen mit Vorschau.");
    expect(markup).toContain("button-add-tour-member");
    expect(markup).toContain("tour-members-section-header");
    expect(markup).toContain("badge-tour-member-21");
    expect(markup).toContain("Diese Liste zeigt alle Mitarbeiter, die auf mindestens einem aktuellen oder zukuenftigen Termin dieser Tour eingeplant sind.");
    expect(markup).toContain('data-testid="tour-form-main-column"');
    expect(markup).toContain('class="w-full"');
  });
});
