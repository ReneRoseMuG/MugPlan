/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Tour-Header-Counter
 * Use Case: UC FT03 - Schlanker Lane-Header ohne zweite Counter-Zeile
 *
 * Abgedeckte Regeln:
 * - Header bleibt einzeilig (h-7) und rendert keine separate Tagescounter-Zeile.
 * - Header zeigt nur den Tournamen (kein Offen/Zu- oder Mitarbeiter-Counter-Text).
 *
 * Fehlerfaelle:
 * - Verdickter Header durch zusaetzliche Zeilen.
 * - Unerwuenschte Zusatztexte im Header.
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
});
