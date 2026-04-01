/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Konflikt-Switch erscheint nur bei vorhandenen Monitoring-Treffern.
 * - Die Badge zeigt die Konfliktanzahl sichtbar an.
 * - Der Switch gibt seinen Zustand per Callback weiter.
 *
 * Fehlerfaelle:
 * - Die Konfliktsteuerung erscheint ohne Treffer.
 * - Der Switch aendert den Workspace-Zustand nicht.
 *
 * Ziel:
 * Das sichtbare Konflikt-Highlight-Wiring des CalendarFilterPanel absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const switchCalls: Array<{ checked?: boolean; onCheckedChange?: (value: boolean) => void; ["data-testid"]?: string }> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div data-testid="calendar-employee-filter" />,
}));

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (value: boolean) => void } & Record<string, unknown>) => {
    switchCalls.push({ checked, onCheckedChange, "data-testid": props["data-testid"] as string | undefined });
    return <button type="button" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} {...props} />;
  },
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

const baseProps = {
  employeeId: null,
  onEmployeeIdChange: vi.fn(),
};

describe("CalendarFilterPanel - conflict highlight", () => {
  beforeEach(() => {
    switchCalls.length = 0;
    vi.clearAllMocks();
  });

  it("renders nothing for conflicts when no count is provided", () => {
    const html = renderToStaticMarkup(<CalendarFilterPanel {...baseProps} />);
    expect(html).not.toContain("switch-conflict-highlight");
  });

  it("renders the switch, badge and toggles the callback", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        conflictAppointmentCount={3}
        conflictHighlightActive={false}
        onConflictHighlightChange={onChange}
      />,
    );

    const conflictSwitch = switchCalls.find((entry) => entry["data-testid"] === "switch-conflict-highlight");
    conflictSwitch?.onCheckedChange?.(true);

    expect(html).toContain("badge-conflict-appointment-count");
    expect(html).toContain(">3<");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
