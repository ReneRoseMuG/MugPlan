/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Artikelliste im Produkt Vorlauf bleibt nach Kategorien gruppiert.
 * - Produktkategorien bleiben vor Komponentenkategorien in der Ausgabe-Reihenfolge.
 * - Kommagetrennte Artikelwerte werden in einzelne sichtbare Zeilen aufgeteilt.
 *
 * Fehlerfaelle:
 * - Die Report-Zelle faellt auf einen einzigen Fliesstext pro Projekt zurueck.
 * - Leere Kategorien erscheinen als sichtbare Leerbloecke.
 * - Die Reihenfolge zwischen Produkt- und Komponentenkategorien kippt.
 *
 * Ziel:
 * Die aufbereitete Artikellisten-Struktur fuer die Produkt-Vorlauf-Tabelle isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import { buildProjectRowArticleGroups } from "../../../client/src/components/ReportsPage";

describe("FT26 UI: ReportsPage product vorlauf article groups", () => {
  it("groups non-empty category values into highlighted row sections with one item per line", () => {
    const result = buildProjectRowArticleGroups(
      {
        projectId: 7,
        projectName: "Projekt Test",
        orderNumber: "ORD-007",
        actualDate: "2099-11-05",
        tourName: "Tour A",
        articleValues: [
          { categoryId: 10, value: "Premium IV, Premium V" },
          { categoryId: 20, value: "HUUM UKU 4.1 Local" },
          { categoryId: 30, value: "   " },
        ],
        projectDescription: null,
        matchedSonderblockTagIds: [],
      },
      [
        { id: 10, name: "Fass Saunen" },
        { id: 30, name: "Rueckwaende" },
        { id: 20, name: "Steuerungen" },
      ],
    );

    expect(result).toEqual([
      {
        categoryId: 10,
        categoryName: "Fass Saunen",
        items: ["Premium IV", "Premium V"],
      },
      {
        categoryId: 20,
        categoryName: "Steuerungen",
        items: ["HUUM UKU 4.1 Local"],
      },
    ]);
  });
});
