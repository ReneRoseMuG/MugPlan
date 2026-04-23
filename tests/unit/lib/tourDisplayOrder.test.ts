/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Touren mit Namen `Tour N` werden numerisch vor frei benannten Touren sortiert.
 * - Frei benannte Touren werden danach alphabetisch mit deutschem Locale sortiert.
 *
 * Fehlerfälle:
 * - `Tour 10` erscheint vor `Tour 2`.
 * - Frei benannte Touren werden zwischen die numerischen Systemtouren gemischt.
 *
 * Ziel:
 * Die gemeinsame Anzeige-Reihenfolge fuer Terminliste, Monitoring und Tourenplan-Report zentral absichern.
 */
import { describe, expect, it } from "vitest";
import { sortToursForDisplay } from "../../../client/src/lib/tourDisplayOrder";

describe("tourDisplayOrder", () => {
  it("sorts numbered tours before custom tour names", () => {
    const sorted = sortToursForDisplay([
      { id: 10, name: "Beta" },
      { id: 4, name: "Tour 10" },
      { id: 1, name: "Tour 2" },
      { id: 9, name: "Alpha" },
      { id: 3, name: "Tour 1" },
    ]);

    expect(sorted.map((tour) => tour.name)).toEqual([
      "Tour 1",
      "Tour 2",
      "Tour 10",
      "Alpha",
      "Beta",
    ]);
  });
});
