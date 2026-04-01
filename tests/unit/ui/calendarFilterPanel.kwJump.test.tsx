/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das KW-Feld erscheint nur im Wochenkontext.
 * - Enter und Blur loesen den KW-Submit aus.
 * - Der Ruecksprung-Button erscheint nur bei vorhandenem Ruecksprungziel.
 * - Fehlerhafte KW-Eingaben markieren das Feld sichtbar.
 *
 * Fehlerfaelle:
 * - Das KW-Feld rendert ausserhalb des Wochenkontexts.
 * - Submit oder Ruecksprung bleiben ohne Callback.
 *
 * Ziel:
 * Das sichtbare KW-Jump-Wiring des CalendarFilterPanel absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const inputCalls: Array<React.InputHTMLAttributes<HTMLInputElement>> = [];
const buttonCalls: Array<React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }> = [];

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
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    buttonCalls.push({ ...props, children });
    return <button {...props}>{children}</button>;
  },
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => {
    inputCalls.push(props);
    return <input {...props} />;
  },
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
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (value: boolean) => void } & Record<string, unknown>) => (
    <button type="button" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} {...props} />
  ),
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

const baseProps = {
  employeeId: null,
  onEmployeeIdChange: vi.fn(),
};

describe("CalendarFilterPanel - kw jump", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    buttonCalls.length = 0;
    vi.clearAllMocks();
  });

  it("renders the kw input only when enabled", () => {
    const withoutKw = renderToStaticMarkup(<CalendarFilterPanel {...baseProps} />);
    const withKw = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    expect(withoutKw).not.toContain("input-calendar-kw-jump");
    expect(withKw).toContain("input-calendar-kw-jump");
  });

  it("calls submit on enter and blur and renders the back button when enabled", () => {
    const onSubmit = vi.fn();
    const onBack = vi.fn();

    renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={onSubmit}
        showKwJumpBack
        onKwJumpBack={onBack}
      />,
    );

    const kwInput = inputCalls.find((entry) => entry["data-testid"] === "input-calendar-kw-jump");
    const backButton = buttonCalls.find((entry) => entry["data-testid"] === "button-calendar-kw-jump-back");

    kwInput?.onKeyDown?.({ key: "Enter", preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>);
    kwInput?.onBlur?.({} as React.FocusEvent<HTMLInputElement>);
    backButton?.onClick?.({} as React.MouseEvent<HTMLButtonElement>);

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("marks the kw input visibly when kwJumpError is set", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showKwJump
        kwJumpValue="53"
        kwJumpError
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    expect(html).toContain("border-destructive");
  });
});
