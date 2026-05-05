/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Tour-Header-Counter
 * Use Case: UC FT03 - Schlanker Lane-Header ohne zweite Counter-Zeile
 *
 * Abgedeckte Regeln:
 * - Header bleibt einzeilig (h-7) und rendert keine separate Tagescounter-Zeile.
 * - Header zeigt nur den Tournamen (kein Offen/Zu- oder Mitarbeiter-Counter-Text).
 * - Der Header enthaelt keine Wochenaktions- oder Notizsegmente mehr.
 *
 * Fehlerfaelle:
 * - Verdickter Header durch zusätzliche Zeilen.
 * - Unerwünschte Zusatztexte, Menüs oder Notizsegmente im Header.
 *
 * Ziel:
 * Sicherstellen, dass der Tour-Header kompakt bleibt und nur Kerninformationen darstellt.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CalendarWeekTourLaneHeaderBar } from "../../../client/src/components/calendar/CalendarWeekTourLaneHeaderBar";

describe("FT03 UI: CalendarWeekTourLaneHeaderBar layout", () => {
  beforeAll(() => {
    vi.stubGlobal("React", React);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders compact single-row header without day-counter markup", () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarWeekTourLaneHeaderBar, {
        label: "Tour Alpha",
        color: "#123456",
        testId: "week-tour-lane-header-tour-1",
      }),
    );

    expect(html).toContain("h-7 w-full");
    expect(html).toContain("Tour Alpha");
    expect(html).toContain("background-image:linear-gradient");
    expect(html).toContain("box-shadow:inset");
    expect(html).not.toContain("Termine");
    expect(html).not.toContain("day-counters");
    expect(html).not.toContain("offen |");
    expect(html).not.toContain("zu |");
  });

  it("does not render status or member count text when lane is collapsed", () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarWeekTourLaneHeaderBar, {
        label: "Tour Beta",
        color: "#654321",
        isExpanded: false,
        testId: "week-tour-lane-header-tour-2",
      }),
    );

    expect(html).toContain("Tour Beta");
    expect(html).not.toContain("offen |");
    expect(html).not.toContain("zu |");
  });

  it("keeps week action and note markers out of the lane header", () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarWeekTourLaneHeaderBar, {
        label: "Tour Gamma",
        color: "#345678",
      }),
    );

    expect(html).toContain("Tour Gamma");
    expect(html).not.toContain('data-testid="menu-marker"');
    expect(html).not.toContain('data-testid="notes-icon-marker"');
    expect(html).not.toContain('data-testid="notes-count-marker"');
    expect(html).toContain("grid-cols-[minmax(0,1fr)]");
  });

  it("supports a reduced preview mode without notes segment or legacy grid split", () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarWeekTourLaneHeaderBar, {
        label: "Tour Preview",
        color: "#345678",
        reduced: true,
      }),
    );

    expect(html).toContain("Tour Preview");
    expect(html).toContain("grid-cols-[minmax(0,1fr)]");
    expect(html).not.toContain("notes-icon-marker");
    expect(html).not.toContain("notes-count-marker");
    expect(html).not.toContain("grid-cols-[2.4rem_minmax(0,1fr)]");
  });

  it("uses a full-size interactive button when the lane can be toggled", () => {
    const html = renderToStaticMarkup(
      React.createElement(CalendarWeekTourLaneHeaderBar, {
        label: "Tour Toggle",
        color: "#345678",
        interactive: true,
        isExpanded: false,
        testId: "week-tour-lane-header-toggle",
      }),
    );

    expect(html).toContain('data-testid="week-tour-lane-header-toggle"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("h-full w-full");
    expect(html).toContain("cursor-pointer");
  });
});
