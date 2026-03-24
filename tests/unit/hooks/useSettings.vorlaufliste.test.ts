/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - resolveVorlauflisteCategorySelection normalisiert Produkt- und Komponentenkategorie-IDs.
 * - Das optionale Feld useShortCodes wird erhalten und nicht verworfen.
 * - Das optionale Feld columnWidths wird gefiltert und erhalten.
 * - Duplikate in den ID-Arrays werden entfernt.
 *
 * Fehlerfaelle:
 * - useShortCodes wird beim Auslesen aus dem Setting-Store verworfen, obwohl gespeichert.
 * - Ungueltige columnWidths werden ungefiltert uebernommen.
 * - Ungueltige Eingaben werden nicht sauber auf leere Defaults zurueckgefuehrt.
 *
 * Ziel:
 * Den clientseitigen Resolver fuer die Vorlaufliste-Kategorieauswahl absichern,
 * insbesondere das korrekte Erhalten des useShortCodes-Feldes nach der Normalisierung.
 */
import { describe, expect, it } from "vitest";

import { resolveVorlauflisteCategorySelection } from "../../../client/src/hooks/useSettings";

describe("useSettings: resolveVorlauflisteCategorySelection", () => {
  it("returns empty defaults for invalid input", () => {
    expect(resolveVorlauflisteCategorySelection(null)).toEqual({ productCategoryIds: [], componentCategoryIds: [] });
    expect(resolveVorlauflisteCategorySelection(undefined)).toEqual({ productCategoryIds: [], componentCategoryIds: [] });
    expect(resolveVorlauflisteCategorySelection([])).toEqual({ productCategoryIds: [], componentCategoryIds: [] });
    expect(resolveVorlauflisteCategorySelection("string")).toEqual({ productCategoryIds: [], componentCategoryIds: [] });
  });

  it("normalizes valid category id arrays and deduplicates", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [1, 2, 2],
      componentCategoryIds: [3],
    });
    expect(result.productCategoryIds).toEqual([1, 2]);
    expect(result.componentCategoryIds).toEqual([3]);
    expect(result.useShortCodes).toBeUndefined();
  });

  it("preserves useShortCodes when set to true", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [1],
      componentCategoryIds: [],
      useShortCodes: true,
    });
    expect(result.useShortCodes).toBe(true);
  });

  it("preserves useShortCodes when set to false", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [],
      componentCategoryIds: [2],
      useShortCodes: false,
    });
    expect(result.useShortCodes).toBe(false);
  });

  it("discards useShortCodes when not a boolean", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [],
      componentCategoryIds: [],
      useShortCodes: "true",
    });
    expect(result.useShortCodes).toBeUndefined();
  });

  it("preserves valid columnWidths and filters invalid entries", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [1],
      componentCategoryIds: [2],
      columnWidths: {
        amount: 180,
        "product-5": 320,
        invalidSmall: 79,
        invalidFloat: 120.5,
      },
    });
    expect(result.columnWidths).toEqual({
      amount: 180,
      "product-5": 320,
    });
  });

  it("filters out non-positive-integer ids", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [1, 0, -1, 1.5, "x"],
      componentCategoryIds: [2],
    });
    expect(result.productCategoryIds).toEqual([1]);
    expect(result.componentCategoryIds).toEqual([2]);
  });
});
