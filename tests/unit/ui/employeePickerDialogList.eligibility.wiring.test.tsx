/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Nicht verfügbare Mitarbeiter werden über `ineligibleReasonById` sichtbar gesperrt
 *   (Name bleibt sichtbar) statt aus der Liste entfernt zu werden.
 * - Der Sperrgrund wird sowohl in der Listen- als auch in der Board-Ansicht angezeigt.
 * - Gesperrte Mitarbeiter sind nicht auswählbar: Checkbox ist disabled, der Umschalt-Handler
 *   bleibt wirkungslos, und im Board fehlt jegliches Klick-Wiring.
 * - Verfügbare Mitarbeiter bleiben uneingeschränkt auswählbar.
 * - Ohne Annotation verhält sich der Picker unverändert (rückwärtskompatibel).
 * - `buildIneligibleReasonById` leitet die Sperrgrund-Map aus der Mitarbeiterliste ab
 *   (nur nicht-leere, getrimmte Gründe; freie Mitarbeiter bleiben außen vor).
 *
 * Fehlerfälle:
 * - Ein gesperrter Mitarbeiter würde stillschweigend ausgeblendet (Nutzer sucht ihn vergeblich).
 * - Ein gesperrter Mitarbeiter ließe sich trotz Sperre auswählen.
 * - Der Sperrgrund würde nicht angezeigt.
 *
 * Ziel:
 * Verhalten und Aussehen der Eignungsanzeige des Mitarbeiter-Pickers (AP1 zu TASK-394 / MS-58)
 * regressionssicher absichern und beweisen.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Employee, Team } from "@shared/schema";

let settingsByKey = new Map<string, { resolvedValue: unknown }>();
const checkboxCalls: Array<{
  testId: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange?: (checked: boolean) => void;
}> = [];
const entityCardCalls = new Map<string, { className: string; onClick: (() => void) | null }>();

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
    onClick,
  }: {
    children?: React.ReactNode;
    className?: string;
    title: string;
    testId?: string;
    onClick?: () => void;
  }) => {
    if (testId) {
      entityCardCalls.set(testId, { className: className ?? "", onClick: onClick ?? null });
    }

    return (
      <div className={className} data-testid={testId}>
        <span>{title}</span>
        {children}
      </div>
    );
  },
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
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }) => {
    const testId = typeof props["data-testid"] === "string" ? props["data-testid"] : undefined;
    return (
      <button type="button" data-testid={testId} disabled={disabled}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => {
    const testId = String(props["data-testid"] ?? "");
    checkboxCalls.push({
      testId,
      checked: checked === true,
      disabled: disabled === true,
      onCheckedChange,
    });

    return (
      <input
        type="checkbox"
        readOnly
        disabled={disabled === true}
        data-checked={checked === true ? "true" : "false"}
        data-testid={testId}
      />
    );
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

import { EmployeePickerDialogList, buildIneligibleReasonById } from "../../../client/src/components/EmployeePickerDialogList";

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

describe("MS-58 UI: EmployeePickerDialogList eligibility wiring", () => {
  beforeEach(() => {
    settingsByKey = new Map<string, { resolvedValue: unknown }>();
    checkboxCalls.length = 0;
    entityCardCalls.clear();
  });

  it("zeigt gesperrte Mitarbeiter in der Liste sichtbar mit Grund und verhindert ihre Auswahl", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);
    const handleSelectionChange = vi.fn();

    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        selectionMode="multiple"
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
        ineligibleReasonById={{ 1: "Überschneidung mit bestehendem Termin" }}
        onSelectionChange={handleSelectionChange}
      />,
    );

    // Gesperrter Mitarbeiter bleibt sichtbar, benannt und mit Grund versehen.
    expect(markup).toContain("Anna Beta");
    expect(markup).toContain("employee-picker-ineligible-reason-1");
    expect(markup).toContain("Überschneidung mit bestehendem Termin");

    const ineligibleCheckbox = checkboxCalls.find((entry) => entry.testId === "employee-picker-checkbox-1");
    const eligibleCheckbox = checkboxCalls.find((entry) => entry.testId === "employee-picker-checkbox-2");
    expect(ineligibleCheckbox?.disabled).toBe(true);
    expect(eligibleCheckbox?.disabled).toBe(false);

    // Sperre greift: das Umschalten des gesperrten Eintrags bleibt wirkungslos.
    ineligibleCheckbox?.onCheckedChange?.(true);
    expect(handleSelectionChange).not.toHaveBeenCalled();

    // Verfügbarer Mitarbeiter bleibt auswählbar.
    eligibleCheckbox?.onCheckedChange?.(true);
    expect(handleSelectionChange).toHaveBeenCalledWith([2]);
  });

  it("zeigt gesperrte Mitarbeiter im Board sichtbar mit Grund und ohne Klick-Wiring", () => {
    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        ineligibleReasonById={{ 1: "Bereits ganztägig verplant" }}
      />,
    );

    // Beide Mitarbeiter bleiben sichtbar und benannt; der gesperrte trägt den Grund.
    expect(markup).toContain("Berta Alpha");
    expect(markup).toContain("Anna Beta");
    expect(markup).toContain("employee-picker-ineligible-reason-1");
    expect(markup).toContain("Bereits ganztägig verplant");

    const ineligibleCard = entityCardCalls.get("employee-picker-card-1");
    const eligibleCard = entityCardCalls.get("employee-picker-card-2");
    expect(ineligibleCard?.className).toContain("employee-picker-card-ineligible");
    expect(eligibleCard?.className ?? "").not.toContain("employee-picker-card-ineligible");

    // Gesperrt: kein Auswahl-Klick; verfügbar: Auswahl-Klick vorhanden.
    expect(ineligibleCard?.onClick).toBeNull();
    expect(typeof eligibleCard?.onClick).toBe("function");
  });

  it("bleibt ohne Annotation unverändert (keine Sperr-Marker, nichts disabled)", () => {
    settingsByKey = new Map([
      ["appointmentEmployeePicker.viewMode", { resolvedValue: "list" }],
    ]);

    const markup = renderToStaticMarkup(
      <EmployeePickerDialogList
        employees={employees}
        teams={teams}
        selectionMode="multiple"
        viewModeSettingKey="appointmentEmployeePicker.viewMode"
      />,
    );

    expect(markup).not.toContain("employee-picker-ineligible-reason");
    expect(markup).not.toContain("employee-picker-card-ineligible");
    expect(checkboxCalls.every((entry) => entry.disabled === false)).toBe(true);
  });
});

describe("MS-58 UI: buildIneligibleReasonById", () => {
  it("übernimmt nur nicht-leere Sperrgründe (getrimmt) und lässt freie Mitarbeiter außen vor", () => {
    const reasonById = buildIneligibleReasonById([
      { id: 10, ineligibleReason: "Bereits verplant: Tour 2" },
      { id: 11, ineligibleReason: "Ganze Woche abwesend" },
      { id: 12, ineligibleReason: null },
      { id: 13, ineligibleReason: "   " },
      { id: 14, ineligibleReason: "  Bereits verplant: Tour 5  " },
    ]);

    expect(reasonById).toEqual({
      10: "Bereits verplant: Tour 2",
      11: "Ganze Woche abwesend",
      14: "Bereits verplant: Tour 5",
    });
    // Gegenbeispiele: freier MA (null) und reiner Whitespace erzeugen keinen Sperreintrag.
    expect(reasonById[12]).toBeUndefined();
    expect(reasonById[13]).toBeUndefined();
  });

  it("ergibt eine leere Map, wenn kein Mitarbeiter gesperrt ist", () => {
    const reasonById = buildIneligibleReasonById([
      { id: 1, ineligibleReason: null },
      { id: 2, ineligibleReason: null },
    ]);

    expect(reasonById).toEqual({});
  });
});
