/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kategorieeinträge werden vor der Spaltenverteilung einmal global alphabetisch sortiert.
 * - Die Verteilung in mehrere Spalten erfolgt spaltenweise von oben nach unten.
 *
 * Fehlerfälle:
 * - Die Sortierung passiert getrennt pro Spalte statt über die Gesamtliste.
 * - Die Spaltenbefüllung folgt nicht der erwarteten Überlauf-Reihenfolge.
 *
 * Ziel:
 * Die sichtbare Listenlogik der Produktionsplanung für alphabetische Gesamt-Sortierung und Spaltenüberlauf gezielt absichern.
 */
import { describe, expect, it } from "vitest";

import { distributeSortedItemsIntoColumns } from "../../../client/src/lib/produktionsplanung-category-layout";

describe("produktionsplanung category layout helpers", () => {
  it("sorts the full list alphabetically before it fills multiple columns", () => {
    const distributed = distributeSortedItemsIntoColumns(
      [
        { itemName: "Zulu" },
        { itemName: "Alpha" },
        { itemName: "Echo" },
        { itemName: "Charlie" },
        { itemName: "Bravo" },
        { itemName: "Delta" },
        { itemName: "Foxtrot" },
      ],
      3,
      (item) => item.itemName,
    );

    expect(distributed).toEqual([
      [{ itemName: "Alpha" }, { itemName: "Bravo" }, { itemName: "Charlie" }],
      [{ itemName: "Delta" }, { itemName: "Echo" }],
      [{ itemName: "Foxtrot" }, { itemName: "Zulu" }],
    ]);
  });
});
