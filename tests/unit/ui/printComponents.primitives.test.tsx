/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PrintPageShell rendert das korrekte Orientierungs-CSS für portrait und landscape.
 * - PrintDayColumn rendert den Label-Kopf und gibt children durch.
 * - PrintAppointmentSlot rendert header, body und optionalen footer-Slot.
 *
 * Fehlerfälle:
 * - CSS-Klassen für Print-Seitenumbruch fehlen nach dem Refactor.
 * - children-Slots werden nicht durchgereicht.
 *
 * Ziel:
 * Die neuen generischen Primitives in Isolation absichern, unabhängig vom Tour-Druckfall.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintPageShell } from "../../../client/src/components/print/PrintPageShell";
import { PrintDayColumn } from "../../../client/src/components/print/PrintDayColumn";
import { PrintAppointmentSlot } from "../../../client/src/components/print/PrintAppointmentSlot";

describe("generische Print-Primitives", () => {
  it("PrintPageShell portrait enthält tour-print-page--portrait, nicht landscape", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintPageShell, { orientation: "portrait" }, "inhalt"),
    );

    expect(html).toContain("tour-print-page--portrait");
    expect(html).not.toContain("tour-print-page--landscape");
  });

  it("PrintPageShell landscape enthält tour-print-page--landscape, nicht portrait", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintPageShell, { orientation: "landscape" }, "inhalt"),
    );

    expect(html).toContain("tour-print-page--landscape");
    expect(html).not.toContain("tour-print-page--portrait");
  });

  it("PrintDayColumn rendert label im Spaltenkopf", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintDayColumn, { label: "Mo, 01.01.", dateKey: "2099-01-01" }),
    );

    expect(html).toContain(`data-testid="tour-print-day-column-2099-01-01"`);
    expect(html).toContain("Mo, 01.01.");
  });

  it("PrintAppointmentSlot rendert header, body und footer wenn übergeben", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintAppointmentSlot, {
        header: React.createElement("span", null, "kopf"),
        body: React.createElement("span", null, "inhalt"),
        footer: React.createElement("span", null, "fussnote"),
      }),
    );

    expect(html).toContain("kopf");
    expect(html).toContain("inhalt");
    expect(html).toContain("fussnote");
  });

  it("PrintAppointmentSlot rendert keinen footer-Wrapper wenn footer nicht übergeben", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintAppointmentSlot, {
        header: React.createElement("span", null, "kopf"),
        body: React.createElement("span", null, "inhalt"),
      }),
    );

    expect(html).toContain("kopf");
    expect(html).toContain("inhalt");
    expect(html).not.toContain("border-t border-slate-200");
  });
});
