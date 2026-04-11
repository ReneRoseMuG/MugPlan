/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - KW-Startfelder akzeptieren nur ISO-KWs, die im relevanten Jahr tatsächlich existieren.
 * - Ungültige Freitexte wie KW 0, KW 53 im 52-Wochen-Jahr oder KW 70 lösen kein onKwStartChange aus.
 * - Spinner-Klicks bleiben auf die jahresspezifische Maximalwoche geklemmt.
 *
 * Fehlerfaelle:
 * - KW 53 wird in einem 52-Wochen-Jahr dennoch übernommen.
 * - Freitext wie 70 überschreibt den letzten gültigen KW-Wert.
 * - Spinner verlassen die gültige Obergrenze des Jahres.
 *
 * Ziel:
 * Die jahresspezifische KW-Grenze des Terminlisten-Zeitraum-Pickers isoliert und deterministisch absichern.
 */
import React, { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DateRangeKwRangePanel } from "../../../client/src/components/ui/DateRangeKwRangePanel";

type TestElement = ReactElement<{ [key: string]: unknown; children?: ReactNode }>;

function findElementByTestId(node: ReactNode, testId: string): TestElement | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByTestId(child, testId);
      if (match) return match;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const element = node as TestElement;
  if (element.props["data-testid"] === testId) {
    return element;
  }
  return findElementByTestId(element.props.children, testId);
}

describe("DateRangeKwRangePanel kw bounds", () => {
  it("ignores invalid kw free text beyond the year-specific maximum", () => {
    vi.stubGlobal("React", React);
    const onKwStartChange = vi.fn();

    const tree = DateRangeKwRangePanel({
      mode: "calendarWeek",
      onModeChange: vi.fn(),
      fromDate: "2024-06-10",
      toDate: "2024-06-16",
      onFromDateChange: vi.fn(),
      onToDateChange: vi.fn(),
      kwStart: 24,
      kwStartMax: 52,
      weekCount: 1,
      onKwStartChange,
      onWeekCountChange: vi.fn(),
      togglePrefix: "appointment-period",
      kwStartInputTestId: "input-kw-start",
    });

    const input = findElementByTestId(tree, "input-kw-start");
    expect(input).not.toBeNull();

    const onInputChange = input?.props.onChange as ((event: { target: { value: string } }) => void) | undefined;
    onInputChange?.({ target: { value: "0" } });
    onInputChange?.({ target: { value: "53" } });
    onInputChange?.({ target: { value: "70" } });
    onInputChange?.({ target: { value: "52" } });

    expect(onKwStartChange).toHaveBeenCalledTimes(1);
    expect(onKwStartChange).toHaveBeenCalledWith(52);
  });

  it("keeps spinner clicks clamped to the year-specific maximum", () => {
    vi.stubGlobal("React", React);
    const onKwStartChange = vi.fn();

    const tree = DateRangeKwRangePanel({
      mode: "calendarWeek",
      onModeChange: vi.fn(),
      fromDate: "2026-12-28",
      toDate: "2027-01-03",
      onFromDateChange: vi.fn(),
      onToDateChange: vi.fn(),
      kwStart: 53,
      kwStartMax: 53,
      weekCount: 1,
      onKwStartChange,
      onWeekCountChange: vi.fn(),
      togglePrefix: "appointment-period",
      kwStartIncrementTestId: "button-kw-start-up",
      kwStartDecrementTestId: "button-kw-start-down",
    });

    const incrementButton = findElementByTestId(tree, "button-kw-start-up");
    const decrementButton = findElementByTestId(tree, "button-kw-start-down");
    expect(incrementButton).not.toBeNull();
    expect(decrementButton).not.toBeNull();

    const onIncrement = incrementButton?.props.onClick as (() => void) | undefined;
    const onDecrement = decrementButton?.props.onClick as (() => void) | undefined;
    onIncrement?.();
    onDecrement?.();

    expect(onKwStartChange).toHaveBeenNthCalledWith(1, 53);
    expect(onKwStartChange).toHaveBeenNthCalledWith(2, 52);
  });
});
