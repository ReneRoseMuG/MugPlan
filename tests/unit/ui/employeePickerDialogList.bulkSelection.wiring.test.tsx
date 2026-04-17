/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Termin-Mitarbeiter-Picker startet bei persistiertem Setting direkt in der Listenansicht.
 * - Die Listenansicht rendert eine sortierte Checkbox-Liste mit Fullname und gemeinsamer Uebernehmen-Aktion.
 * - Ohne persistierten Listenmodus bleibt die bestehende Board-Sicht aktiv.
 *
 * Fehlerfaelle:
 * - Der Picker ignoriert den gespeicherten Listenmodus.
 * - Die Listenansicht verliert Checkboxen oder die sichtbare Sammeluebernahme-Aktion.
 * - Die Board-Sicht wird durch den Bulk-Modus ungewollt ersetzt.
 *
 * Ziel:
 * Das sichtbare Zielverhalten des Termin-Mitarbeiter-Pickers fuer persistierten Listenstart und Bulk-UI absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Employee, Team } from "@shared/schema";

let settingsByKey = new Map<string, { resolvedValue: unknown }>();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settingsByKey,
    setSetting: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children, gridTestId }: { children?: React.ReactNode; gridTestId?: string }) => (
    <div data-testid={gridTestId}>{children}</div>
  ),
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({
    children,
    title,
    testId,
  }: {
    children?: React.ReactNode;
    title: string;
    testId?: string;
  }) => (
    <div data-testid={testId}>
      <span>{title}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/filter-panels/employee-picker-filter-panel", () => ({
  EmployeePickerFilterPanel: () => <div data-testid="employee-picker-filter" />,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({
    title,
    viewModeToggle,
    filterSlot,
    contentSlot,
    footerSlot,
  }: {
    title: string;
    viewModeToggle?: React.ReactNode;
    filterSlot?: React.ReactNode;
    contentSlot: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => (
    <div data-testid="employee-picker-layout">
      <h1>{title}</h1>
      {viewModeToggle}
      {filterSlot}
      {contentSlot}
      {footerSlot}
    </div>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: Record<string, unknown>) => <input type="checkbox" readOnly {...props} />,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <div data-testid={String(props["data-testid"] ?? "")}>{children}</div>
  ),
  ToggleGroupItem: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
  ),
}));

import { EmployeePickerDialogList } from "../../../client/src/components/EmployeePickerDialogList";

const employees: Employee[] = [
  {
    id: 2,
    firstName: "Berta",
    lastName: "Alpha",
    fullName: "Berta Alpha",
    teamId: 1,
    email: null,
    phone: null,
    color: null,
    note: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Employee,
  {
    id: 1,
    firstName: "Anna",
    lastName: "Beta",
    fullName: "Anna Beta",
    teamId: null,
    email: null,
    phone: null,
    color: null,
    note: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Employee,
];

const teams: Team[] = [
  {
    id: 1,
    name: "Montage",
    color: "#123456",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Team,
];

function renderPicker() {
  return renderToStaticMarkup(
    <EmployeePickerDialogList
      employees={employees}
      teams={teams}
      tours={[]}
      allowBulkSelection
      viewModeSettingKey="appointmentEmployeePicker.viewMode"
    />,
  );
}

describe("FT01 UI: EmployeePickerDialogList bulk selection wiring", () => {
  beforeEach(() => {
    settingsByKey = new Map<string, { resolvedValue: unknown }>();
  });

  it("renders the persisted list mode with sorted checkbox rows and a shared confirm action", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);

    const markup = renderPicker();

    expect(markup).toContain("employee-picker-list-view");
    expect(markup).toContain("employee-picker-checkbox-2");
    expect(markup).toContain("employee-picker-checkbox-1");
    expect(markup).toContain("button-confirm-employee-picker-selection");
    expect(markup).toContain("Mitarbeiter übernehmen");

    const alphaIndex = markup.indexOf("Berta Alpha");
    const betaIndex = markup.indexOf("Anna Beta");
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeGreaterThan(alphaIndex);
  });

  it("keeps the board view active by default even when bulk selection is enabled", () => {
    const markup = renderPicker();

    expect(markup).toContain("toggle-employee-picker-view-mode");
    expect(markup).toContain("toggle-employee-picker-board");
    expect(markup).toContain("toggle-employee-picker-list");
    expect(markup).toContain("list-employee-picker");
    expect(markup).toContain("employee-picker-card-2");
    expect(markup).toContain("employee-picker-card-1");
    expect(markup).not.toContain("employee-picker-list-view");
  });
});
