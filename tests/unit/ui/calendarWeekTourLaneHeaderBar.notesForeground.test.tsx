/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Lane-Header rendert Notiz-Icon und Notizzaehler weiterhin sichtbar, ohne den ganzen Header anzuheben.
 * - Das Wochenaktions-Menue bekommt eine lokale Vordergrund-Ebene gegen Hover-Flaechen.
 * - Die Notizanzeige ist rein visuell und bringt keine klickbare Pointer-Cursor-Stilistik mehr mit.
 *
 * Fehlerfaelle:
 * - Der komplette Header wird ueber einen globalen z-Index vor die Tages-Controls gelegt.
 * - Das Menue verliert seine lokale Vordergrund-Ebene gegenueber Hover-Flaechen.
 *
 * Ziel:
 * Lokales Vordergrund-Layering fuer Menue und passive Notizanzeige absichern, ohne die Tages-Controls zu ueberdecken.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarWeekTourLaneHeaderBar } from "../../../client/src/components/calendar/CalendarWeekTourLaneHeaderBar";

describe("CalendarWeekTourLaneHeaderBar", () => {
  it("keeps menu and note markers visible without lifting the entire header above day controls", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekTourLaneHeaderBar
        label="Tour Nord"
        color="#123456"
        menuSlot={<span data-testid="menu-marker">M</span>}
        weekNotesIcon={<span data-testid="notes-icon-marker">I</span>}
        weekNotesCount={<span data-testid="notes-count-marker">3</span>}
      />,
    );

    expect(html).toContain('relative z-20 flex items-center justify-center');
    expect(html).toContain('relative z-10 flex h-full flex-shrink-0 items-center opacity-85');
    expect(html).toContain('data-testid="notes-icon-marker"');
    expect(html).toContain('data-testid="notes-count-marker"');
    expect(html).toContain('data-testid="menu-marker"');
    expect(html).not.toContain('relative z-10 h-7 w-full');
    expect(html).not.toContain("cursor-pointer");
  });
});
