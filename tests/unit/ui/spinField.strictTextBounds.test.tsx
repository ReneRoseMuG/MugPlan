/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - SpinField kann für Texteingaben strikte Bereichsgrenzen erzwingen.
 * - Ungültige Freitexte lösen in strikten Feldern kein onChange aus.
 * - Spinner-Klicks bleiben weiterhin clampend und bedienbar.
 *
 * Fehlerfälle:
 * - KW 0 oder 54 überschreiben in strikten Feldern den gültigen Zustand.
 * - Spinner-Klicks verlassen trotz Begrenzung den erlaubten Bereich.
 *
 * Ziel:
 * Die Reports-KW-Eingabe über die gemeinsame SpinField-Hülle regressionssicher absichern, ohne das UI-Layout zu ändern.
 */
import React, { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SpinField } from "../../../client/src/components/ui/SpinField";

type TestElement = ReactElement<{ [key: string]: unknown; children?: ReactNode }>;

function findElementByTestId(node: ReactNode, testId: string): TestElement | null {
  if (!node) {
    return null;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByTestId(child, testId);
      if (match) {
        return match;
      }
    }
    return null;
  }
  if (!isValidElement(node)) {
    return null;
  }
  const element = node as TestElement;
  if (element.props["data-testid"] === testId) {
    return element;
  }
  return findElementByTestId(element.props.children, testId);
}

describe("SpinField strict text bounds", () => {
  it("ignores invalid free text when strict bounds are enabled", () => {
    vi.stubGlobal("React", React);
    const onChange = vi.fn();
    const tree = SpinField({
      label: "KW Start",
      value: 14,
      onChange,
      min: 1,
      max: 53,
      strictTextBounds: true,
      inputTestId: "input-spinfield-kw",
    });

    const input = findElementByTestId(tree, "input-spinfield-kw");
    expect(input).not.toBeNull();

    const onInputChange = input?.props.onChange as ((event: { target: { value: string } }) => void) | undefined;
    onInputChange?.({ target: { value: "0" } });
    onInputChange?.({ target: { value: "054" } });
    onInputChange?.({ target: { value: "14" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(14);
  });

  it("keeps spinner button clamping active", () => {
    vi.stubGlobal("React", React);
    const onChange = vi.fn();
    const tree = SpinField({
      label: "KW Start",
      value: 1,
      onChange,
      min: 1,
      max: 53,
      strictTextBounds: true,
      incrementTestId: "button-spinfield-kw-up",
      decrementTestId: "button-spinfield-kw-down",
    });

    const incrementButton = findElementByTestId(tree, "button-spinfield-kw-up");
    const decrementButton = findElementByTestId(tree, "button-spinfield-kw-down");

    expect(incrementButton).not.toBeNull();
    expect(decrementButton).not.toBeNull();

    const onIncrement = incrementButton?.props.onClick as (() => void) | undefined;
    const onDecrement = decrementButton?.props.onClick as (() => void) | undefined;
    onIncrement?.();
    onDecrement?.();

    expect(onChange).toHaveBeenNthCalledWith(1, 2);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
  });
});
