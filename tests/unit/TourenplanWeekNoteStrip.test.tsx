/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Farbdruck: Hintergrundtint wird als cardColor + "1a" gerendert
 * - Spardruck: Hintergrundfarbe ist immer white (#ffffff), unabhängig von cardColor
 * - Notiz ohne Titel rendert keine Header-Zeile
 * - Notiz mit Titel rendert die Header-Zeile sichtbar
 *
 * Fehlerfälle:
 * - cardColor null führt nicht zu ungültigem CSS (Fallback #cbd5e1)
 * - Leerer body wird nicht gerendert
 *
 * Ziel:
 * Das visuelle Rendering von TourenplanWeekNoteStrip für Farb- und Spardruckmodus isoliert absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TourenplanWeekNoteStrip } from "../../client/src/components/reports/TourenplanWeekNoteStrip";
import type { TourenplanWeekNote } from "../../client/src/components/reports/tourenplan-model";

function makeNote(overrides: Partial<TourenplanWeekNote> = {}): TourenplanWeekNote {
  return {
    id: 1,
    sourceType: "appointment",
    title: "Hinweis",
    body: "<p>Wichtige Info</p>",
    cardColor: "#3b82f6",
    print: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TourenplanWeekNoteStrip", () => {
  it("rendert im Farbdruck einen Hintergrundtint (cardColor + 1a)", () => {
    const note = makeNote({ cardColor: "#3b82f6" });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="farbdruck" />,
    );
    expect(html).toContain("#3b82f61a");
  });

  it("rendert im Spardruck weißen Hintergrund (#ffffff)", () => {
    const note = makeNote({ cardColor: "#3b82f6" });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="spardruck" />,
    );
    expect(html).toContain("background:#ffffff");
  });

  it("rendert keinen Header-Bereich wenn title leer ist", () => {
    const note = makeNote({ title: "" });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="farbdruck" />,
    );
    expect(html).not.toContain("font-weight:600");
  });

  it("rendert die Header-Zeile wenn title gesetzt ist", () => {
    const note = makeNote({ title: "KW-Hinweis" });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="farbdruck" />,
    );
    expect(html).toContain("KW-Hinweis");
    expect(html).toContain("font-weight:600");
  });

  it("verwendet Fallback-Farbe #cbd5e1 wenn cardColor null", () => {
    const note = makeNote({ cardColor: null });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="farbdruck" />,
    );
    expect(html).toContain("#cbd5e1");
  });

  it("rendert den Body-Text ohne HTML-Tags (stripHtmlToText)", () => {
    const note = makeNote({ body: "<p>Wichtige <b>Info</b></p>" });
    const html = renderToStaticMarkup(
      <TourenplanWeekNoteStrip note={note} printMode="farbdruck" />,
    );
    expect(html).toContain("Wichtige");
    expect(html).toContain("Info");
    expect(html).not.toContain("<p>");
    expect(html).not.toContain("<b>");
  });
});
