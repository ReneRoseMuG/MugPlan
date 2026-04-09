/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Lane-Header rendert Notiz-Icon und Notizzaehler in einer Vordergrund-Ebene.
 *
 * Fehlerfaelle:
 * - Ueberlagernde Hover-Flaechen koennen den Notiz-Trigger am Anfang der Lane ueberdecken.
 * - Der Notizzaehler verliert seine Vordergrund-Layering und wird nicht mehr direkt klickbar.
 *
 * Ziel:
 * Die Vordergrund-Layering der Notizsteuerung im Tour-Lane-Header gegen Klick-Regressionen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarWeekTourLaneHeaderBar } from "../../../client/src/components/calendar/CalendarWeekTourLaneHeaderBar";

describe("CalendarWeekTourLaneHeaderBar", () => {
  it("keeps week note controls in the foreground layer", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekTourLaneHeaderBar
        label="Tour Nord"
        color="#123456"
        weekNotesIcon={<span data-testid="notes-icon-marker">I</span>}
        weekNotesCount={<span data-testid="notes-count-marker">3</span>}
      />,
    );

    expect(html).toContain('relative z-10 flex-shrink-0 opacity-80');
    expect(html).toContain('data-testid="notes-icon-marker"');
    expect(html).toContain('data-testid="notes-count-marker"');
  });
});
