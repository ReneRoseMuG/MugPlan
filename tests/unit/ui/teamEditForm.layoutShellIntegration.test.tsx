/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TeamEditForm rendert im EntityFormShell-Layout Header, Hauptbereich, Sidebar und Footer.
 * - Im Create-Modus bleiben die erwarteten Bedienelemente fuer Farbauswahl, Mitgliederbereich und Footer sichtbar.
 * - Im Edit-Modus bleibt die Delete-Aktion erhalten und bestehende Mitglieder werden weiter sichtbar gerendert.
 *
 * Fehlerfaelle:
 * - Das Teamformular verliert die erwartete Sidebar oder rendert die Shell-Struktur unvollständig.
 * - Erwartete Team-Elemente wie Save/Cancel, Farbauswahl oder Mitgliederbereich verschwinden nach dem Shell-Umbau.
 * - Die Delete-Aktion geht im Edit-Modus verloren.
 *
 * Ziel:
 * Das neue Shell-Layout des Teamformulars ueber sichtbare Struktur und die erwarteten Kernelemente regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const employeePickerCalls: Array<Record<string, unknown>> = [];

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
    <div data-testid="team-members-section-header">
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

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: (props: Record<string, unknown>) => {
    employeePickerCalls.push(props);
    return <div>employee-picker</div>;
  },
}));

import { TeamEditForm } from "../../../client/src/components/TeamEditForm";

const teamFixture = {
  id: 5,
  name: "Team Nord",
  color: "#224466",
  version: 2,
  members: [
    {
      id: 33,
      firstName: "Lina",
      lastName: "Leitung",
      fullName: "Leitung, Lina",
      email: null,
      phone: null,
      isActive: true,
      teamId: 5,
      tourId: null,
      version: 1,
    },
  ],
};

describe("FT06/FT07 team form shell layout integration", () => {
  const noop = async () => undefined;

  it("keeps the shared employee picker wiring for board and list selection", () => {
    employeePickerCalls.length = 0;

    renderToStaticMarkup(
      <TeamEditForm
        team={null}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        isCreate
        defaultName="Neues Team"
        onCancel={() => undefined}
      />,
    );

    expect(employeePickerCalls).toHaveLength(1);
    expect(employeePickerCalls[0]).toMatchObject({
      allowBulkSelection: true,
      viewModeSettingKey: "appointmentEmployeePicker.viewMode",
      title: "Mitarbeiter auswählen",
    });
    expect(employeePickerCalls[0].onSelectEmployee).toEqual(expect.any(Function));
    expect(employeePickerCalls[0].onConfirmSelection).toEqual(expect.any(Function));
  });

  it("renders the expected create elements in shell mode with the sidebar", () => {
    employeePickerCalls.length = 0;

    const markup = renderToStaticMarkup(
      <TeamEditForm
        team={null}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        isCreate
        defaultName="Neues Team"
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("entity-form-shell-header");
    expect(markup).toContain("team-form-main-column");
    expect(markup).toContain("entity-form-shell-footer");
    expect(markup).toContain("entity-form-shell-sidebar");
    expect(markup).toContain("team-form-sidebar");
    expect(markup).not.toContain("team-form-functions-panel");
    expect(markup).toContain("button-close-team");
    expect(markup).toContain("button-cancel-team");
    expect(markup).toContain("button-save-team");
    expect(markup).not.toContain("button-delete-team-form");
    expect(markup).toContain("button-team-color-picker");
    expect(markup).toContain("button-add-team-member");
    expect(markup).toContain("team-members-section-header");
    expect(markup).toContain("Keine Mitarbeiter zugewiesen");
  });

  it("keeps delete and existing member badges visible in edit mode", () => {
    employeePickerCalls.length = 0;

    const markup = renderToStaticMarkup(
      <TeamEditForm
        team={teamFixture}
        allEmployees={teamFixture.members}
        onSubmit={noop}
        onDelete={() => undefined}
        canDelete
        isSaving={false}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("entity-form-shell-sidebar");
    expect(markup).toContain("team-form-sidebar");
    expect(markup).toContain("team-form-functions-panel");
    expect(markup).toContain("button-delete-team-form");
    expect(markup).toContain("badge-team-member-33");
  });
});
