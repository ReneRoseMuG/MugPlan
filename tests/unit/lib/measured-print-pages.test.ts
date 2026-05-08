/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die generische Karten-Paginierung nutzt echte gemessene Kartenhoehen.
 * - Karten werden vollstaendig auf die naechste Seite verschoben, wenn sie nicht mehr passen.
 * - Leere Kartenreports erzeugen weiterhin eine erste Druckseite.
 *
 * Fehlerfaelle:
 * - Eine Karte wird trotz gemessenem Hoehenueberlauf auf die aktuelle Seite gruppiert.
 * - Fehlende Daten erzeugen keine Druckseite.
 *
 * Ziel:
 * Die gemeinsame Print-Basis fuer kartenbasierte Reports unabhaengig vom konkreten Report absichern.
 */
import { describe, expect, it } from "vitest";
import { paginateMeasuredPrintCards } from "../../../client/src/lib/measured-print-pages";

describe("measured print pages", () => {
  it("moves the next card to a new page based on measured heights and card gap", () => {
    const pages = paginateMeasuredPrintCards({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
      pageCapacityPx: 300,
      cardHeights: {
        a: 120,
        b: 160,
        c: 80,
      },
      getItemKey: (item) => item.id,
      itemGapPx: 16,
    });

    expect(pages.map((page) => page.items.map((item) => item.id))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("keeps an oversized card intact on its own page", () => {
    const pages = paginateMeasuredPrintCards({
      items: [{ id: 1 }, { id: 2 }],
      pageCapacityPx: 200,
      cardHeights: {
        1: 260,
        2: 120,
      },
      getItemKey: (item) => item.id,
      itemGapPx: 16,
    });

    expect(pages.map((page) => page.items.map((item) => item.id))).toEqual([[1], [2]]);
  });

  it("returns an empty first page for empty reports", () => {
    const pages = paginateMeasuredPrintCards({
      items: [],
      pageCapacityPx: 300,
      cardHeights: {},
      getItemKey: (item: { id: number }) => item.id,
      itemGapPx: 16,
    });

    expect(pages).toEqual([{ pageNumber: 1, items: [] }]);
  });
});
