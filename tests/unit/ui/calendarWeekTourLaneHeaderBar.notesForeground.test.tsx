/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Lane-Header rendert Notiz-Icon und Notizzaehler in einer Vordergrund-Ebene.
 * - Die Notizanzeige ist rein visuell und bringt keine klickbare Pointer-Cursor-Stilistik mehr mit.
 *
 * Fehlerfaelle:
 * - Ueberlagernde Hover-Flaechen koennen die Notizanzeige am Anfang der Lane ueberdecken.
 * - Der Notizzaehler verliert seine Vordergrund-Layering.
 *
 * Ziel:
 * Die Vordergrund-Layering der passiven Notizanzeige im Tour-Lane-Header absichern.
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

    expect(html).toContain('relative z-10');
    expect(html).toContain('relative z-10 h-7 w-full');
    expect(html).toContain('data-testid="notes-icon-marker"');
    expect(html).toContain('data-testid="notes-count-marker"');
    expect(html).not.toContain("cursor-pointer");
  });
});
