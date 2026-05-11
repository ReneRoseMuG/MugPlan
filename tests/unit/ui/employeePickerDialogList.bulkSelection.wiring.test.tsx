/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Termin-Mitarbeiter-Picker startet bei persistiertem Setting direkt in der Listenansicht.
 * - Die Listenansicht rendert eine sortierte Checkbox-Liste mit Fullname und gemeinsamer Uebernehmen-Aktion.
 * - Ohne persistierten Listenmodus bleibt die bestehende Board-Sicht aktiv.
 * - Der neue selectionMode steuert Single- und Multiple-Auswahl, waehrend der alte Alias kompatibel bleibt.
 * - Kontrollierte und initiale Mehrfachauswahl werden bereinigt und an Aufrufer zurueckgemeldet.
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
const checkboxCalls: Array<{
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  testId: string;
}> = [];
const buttonCalls = new Map<string, { disabled?: boolean; onClick?: () => void }>();

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
    className,
    title,
    testId,
  }: {
    children?: React.ReactNode;
    className?: string;
    title: string;
    testId?: string;
  }) => (
    <div className={className} data-testid={testId}>
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
      <footer data-testid="employee-picker-layout-footer">{footerSlot}</footer>
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => {
    const testId = typeof props["data-testid"] === "string" ? props["data-testid"] : null;
    if (testId) {
      buttonCalls.set(testId, { disabled, onClick });
    }

    return (
      <button
        type="button"
        data-testid={testId ?? undefined}
        disabled={disabled}
      >
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => {
    const testId = String(props["data-testid"] ?? "");
    checkboxCalls.push({
      checked: checked === true,
      onCheckedChange,
      testId,
    });

    return <input type="checkbox" readOnly data-checked={checked === true ? "true" : "false"} data-testid={testId} />;
  },
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
      selectionMode="multiple"
      viewModeSettingKey="appointmentEmployeePicker.viewMode"
    />,
  );
}

describe("FT01 UI: EmployeePickerDialogList bulk selection wiring", () => {
  beforeEach(() => {
    settingsByKey = new Map<string, { resolvedValue: unknown }>();
    checkboxCalls.length = 0;
    buttonCalls.clear();
  });

  it("renders the persisted list mode with sorted checkbox rows and a shared confirm action", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);

    const markup = renderPicker();

    expect(markup).toContain("employee-picker-list-view");
    expect(markup).toContain("employee-picker-layout-footer");
    expect(markup).toContain("employee-picker-footer");
    expect(markup).toContain("employee-picker-filter");
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
    expect(markup).toContain("employee-picker-layout-footer");
    expect(markup).toContain("employee-picker-filter");
    expect(markup).toContain("employee-picker-card-2");
    expect(markup).toContain("employee-picker-card-1");
    expect(markup).not.toContain("employee-picker-list-view");
  });

  it("keeps single mode board-only and uses optional team and tour props", () => {
    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        selectedEmployeeId={1}
      />,
    );

    expect(markup).toContain("list-employee-picker");
    expect(markup).toContain("employee-picker-card-2");
    expect(markup).toContain("employee-picker-card-1");
    expect(markup).toContain("ring-1 ring-primary/30 border-primary/40");
    expect(markup).toContain("employee-picker-footer");
    expect(markup).toContain("employee-picker-filter");
    expect(markup).not.toContain("toggle-employee-picker-view-mode");
    expect(markup).not.toContain("button-confirm-employee-picker-selection");
  });

  it("keeps the legacy allowBulkSelection alias active for compatibility", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);

    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        allowBulkSelection
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
      />,
    );

    expect(markup).toContain("employee-picker-list-view");
    expect(markup).toContain("toggle-employee-picker-view-mode");
    expect(markup).toContain("button-confirm-employee-picker-selection");
  });

  it("renders a cleaned default selection in list mode", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);

    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        selectionMode="multiple"
        defaultSelectedEmployeeIds={[1, 999, 1, 2, -1]}
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
      />,
    );

    expect(markup).toContain("Mitarbeiter übernehmen (2)");
    expect(checkboxCalls).toEqual([
      expect.objectContaining({ checked: true, testId: "employee-picker-checkbox-2" }),
      expect.objectContaining({ checked: true, testId: "employee-picker-checkbox-1" }),
    ]);
  });

  it("confirms controlled selections without unavailable or duplicate employee ids", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);
    const handleConfirmSelection = vi.fn();

    renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        selectionMode="multiple"
        selectedEmployeeIds={[2, 999, 2, 1]}
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
        onConfirmSelection={handleConfirmSelection}
      />,
    );

    const confirmButton = buttonCalls.get("button-confirm-employee-picker-selection");
    expect(confirmButton?.disabled).toBe(false);

    confirmButton?.onClick?.();

    expect(handleConfirmSelection).toHaveBeenCalledWith([2, 1]);
  });

  it("reports controlled checkbox changes through onSelectionChange", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);
    const handleSelectionChange = vi.fn();

    renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        selectionMode="multiple"
        selectedEmployeeIds={[2, 1]}
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
        onSelectionChange={handleSelectionChange}
      />,
    );

    const annaCheckbox = checkboxCalls.find((checkbox) => checkbox.testId === "employee-picker-checkbox-1");
    annaCheckbox?.onCheckedChange?.(false);

    expect(handleSelectionChange).toHaveBeenCalledWith([2]);
  });
});
