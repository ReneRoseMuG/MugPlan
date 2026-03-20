/**
 * Test Scope:
 *
 * Feature: FT21/FT28 - PlusActionButton
 *
 * Abgedeckte Regeln:
 * - Der PlusActionButton rendert den zentralen ghost/icon-Button mit kompakter Groesse.
 * - Interaktionsrelevante Props werden an die Button-Basis weitergereicht.
 *
 * Fehlerfaelle:
 * - Der gemeinsame Plus-Button driftet bei Variant, Typ oder Disabled-Verhalten auseinander.
 *
 * Ziel:
 * Den gemeinsamen Plus-Button ueber sichtbare Button-Props statt ueber Quelltextstrings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buttonCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    buttonCalls.push(props);
    return (
      <button
        type={String(props.type ?? "button")}
        data-variant={String(props.variant ?? "")}
        data-size={String(props.size ?? "")}
        data-testid={String(props["data-testid"] ?? "")}
        className={String(props.className ?? "")}
        disabled={Boolean(props.disabled)}
        aria-label={props["aria-label"] as string | undefined}
      >
        {props.children}
      </button>
    );
  },
}));

import { PlusActionButton } from "../../../client/src/components/ui/plus-action-button";

describe("FT21/FT28 UI: PlusActionButton behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    buttonCalls.length = 0;
  });

  it("renders a compact ghost icon button and forwards interaction props", () => {
    const handleClick = vi.fn();

    const html = renderToStaticMarkup(
      <PlusActionButton
        className="extra-class"
        data-testid="button-plus"
        aria-label="Hinzufuegen"
        disabled
        onClick={handleClick}
      />,
    );

    expect(buttonCalls[0]).toMatchObject({
      type: "button",
      size: "icon",
      variant: "ghost",
      disabled: true,
      onClick: handleClick,
      "data-testid": "button-plus",
      "aria-label": "Hinzufuegen",
    });
    expect(String(buttonCalls[0].className)).toContain("h-7 w-7");
    expect(String(buttonCalls[0].className)).toContain("extra-class");
    expect(html).toContain("button-plus");
  });
});
