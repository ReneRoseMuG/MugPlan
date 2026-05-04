/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Lane-Header rendert nur noch die Tour-Überschrift.
 * - Entfernte Wochenaktions- und Notizsegmente heben den Header nicht mehr ueber Tages-Controls.
 *
 * Fehlerfaelle:
 * - Alte Menü- oder Notizsegmente tauchen wieder im Header auf.
 *
 * Ziel:
 * Den reduzierten Header ohne Menü- und Notizsegmente absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarWeekTourLaneHeaderBar } from "../../../client/src/components/calendar/CalendarWeekTourLaneHeaderBar";

describe("CalendarWeekTourLaneHeaderBar", () => {
  it("keeps removed menu and note markers out of the lane header", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekTourLaneHeaderBar
        label="Tour Nord"
        color="#123456"
      />,
    );

    expect(html).toContain("Tour Nord");
    expect(html).not.toContain('data-testid="notes-icon-marker"');
    expect(html).not.toContain('data-testid="notes-count-marker"');
    expect(html).not.toContain('data-testid="menu-marker"');
    expect(html).not.toContain('relative z-10 h-7 w-full');
    expect(html).not.toContain("cursor-pointer");
  });
});
