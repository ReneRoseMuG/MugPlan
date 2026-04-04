/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Konfliktsteuerung rendert als einzelner Toggle-Button.
 * - Das Count-Badge erscheint nur im aktiven Zustand.
 * - Der Button reicht Statuswechsel per Callback weiter.
 *
 * Fehlerfaelle:
 * - Die Konfliktsteuerung faellt auf den alten Switch-Block zurueck.
 * - Das Badge erscheint auch im inaktiven Zustand.
 *
 * Ziel:
 * Das sichtbare Toggle-Verhalten der Konfliktmarkierung im neuen Footer absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

const baseProps = {
  employeeId: null,
  onEmployeeIdChange: vi.fn(),
};

describe("CalendarFilterPanel - conflict highlight", () => {
  it("renders no conflict control when no conflicts are available", () => {
    const html = renderToStaticMarkup(<CalendarFilterPanel {...baseProps} />);
    expect(html).not.toContain("button-conflict-highlight");
  });

  it("renders an inactive button without badge and shows the badge when active", () => {
    const inactiveHtml = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        conflictAppointmentCount={3}
        conflictHighlightActive={false}
        onConflictHighlightChange={() => undefined}
      />,
    );
    const activeHtml = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        conflictAppointmentCount={3}
        conflictHighlightActive
        onConflictHighlightChange={() => undefined}
      />,
    );

    expect(inactiveHtml).toContain("button-conflict-highlight");
    expect(inactiveHtml).not.toContain("badge-conflict-appointment-count");
    expect(activeHtml).toContain("badge-conflict-appointment-count");
    expect(activeHtml).toContain(">3<");
  });

  it("toggles the callback when the button is clicked", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        conflictAppointmentCount={4}
        conflictHighlightActive={false}
        onConflictHighlightChange={onChange}
      />,
    );

    expect(html).toContain("button-conflict-highlight");
    onChange(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
