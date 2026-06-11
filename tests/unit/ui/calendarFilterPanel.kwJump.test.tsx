/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die KW-Steuerung erscheint nur im Wochenkontext.
 * - Enter und Blur loesen weiterhin den Submit aus.
 * - Das Redesign rendert keinen Ruecksprung-Link mehr.
 * - Fehlerhafte Eingaben markieren das Spinner-Feld sichtbar.
 * - Der optionale Jahr-Spinner erscheint nur, wenn Jahr-Jump-Handler uebergeben werden.
 *
 * Fehlerfaelle:
 * - Die KW-Steuerung verschwindet im Week-Footer.
 * - Das Feld faellt auf einen Browser-Number-Input oder den alten Ruecksprung-Link zurueck.
 *
 * Ziel:
 * Das sichtbare KW-Spinner-Wiring des neuen Wochenkalender-Footers absichern.
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

  it("renders the kw spinner only when week jumping is enabled", () => {
    const withoutKw = renderToStaticMarkup(<CalendarFilterPanel {...baseProps} />);
    const withKw = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    expect(withoutKw).not.toContain("input-calendar-kw-jump");
    expect(withKw).toContain("input-calendar-kw-jump");
  });

  it("submits on enter and blur and renders the back button when enabled", () => {
    const onSubmit = vi.fn();
    const onBack = vi.fn();
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
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
    expect(html).toContain("button-calendar-kw-jump-back");
  });

  it("marks the kw spinner visibly when kwJumpError is set", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        showKwJump
        kwJumpValue="53"
        kwJumpError
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    const kwInput = inputCalls.find((entry) => entry["data-testid"] === "input-calendar-kw-jump");

    expect(html).toContain("text-destructive");
    expect(kwInput?.["aria-invalid"]).toBe(true);
  });

  it("renders the kw input as a text-based numeric spinner field", () => {
    renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        showKwJump
        kwJumpValue="14"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    const kwInput = inputCalls.find((entry) => entry["data-testid"] === "input-calendar-kw-jump");

    expect(kwInput?.type).toBe("text");
    expect(kwInput?.inputMode).toBe("numeric");
    expect(kwInput?.pattern).toBe("[0-9]*");
  });
});

describe("CalendarFilterPanel - year jump", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    buttonCalls.length = 0;
    vi.clearAllMocks();
  });

  it("renders the year spinner only when year jump handlers are provided", () => {
    const withoutYear = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );
    const withYear = renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
        yearJumpValue="2026"
        onYearJumpChange={() => undefined}
        onYearJumpSubmit={() => undefined}
      />,
    );

    expect(withoutYear).not.toContain("input-calendar-year-jump");
    expect(withYear).toContain("input-calendar-year-jump");
  });

  it("submits the year jump on enter and blur", () => {
    const onYearSubmit = vi.fn();
    renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
        yearJumpValue="2026"
        onYearJumpChange={() => undefined}
        onYearJumpSubmit={onYearSubmit}
      />,
    );

    const yearInput = inputCalls.find((entry) => entry["data-testid"] === "input-calendar-year-jump");
    yearInput?.onKeyDown?.({ key: "Enter", preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>);
    yearInput?.onBlur?.({} as React.FocusEvent<HTMLInputElement>);

    expect(onYearSubmit).toHaveBeenCalledTimes(2);
  });

  it("renders the year input as a four-digit text-based numeric field", () => {
    renderToStaticMarkup(
      <CalendarFilterPanel
        {...baseProps}
        showWeekDisplayMode
        showKwJump
        kwJumpValue="22"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
        yearJumpValue="2026"
        onYearJumpChange={() => undefined}
        onYearJumpSubmit={() => undefined}
      />,
    );

    const yearInput = inputCalls.find((entry) => entry["data-testid"] === "input-calendar-year-jump");

    expect(yearInput?.type).toBe("text");
    expect(yearInput?.inputMode).toBe("numeric");
    expect(yearInput?.maxLength).toBe(4);
  });
});
