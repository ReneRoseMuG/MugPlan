/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - resolveVorlauflisteCategorySelection normalisiert columnOrder und hiddenColumns als deduplizierte String-Arrays.
 * - useShortCodes und gültige columnWidths bleiben erhalten.
 * - Legacy-Felder aus dem alten Kategorie-Setting werden still ignoriert.
 *
 * Fehlerfälle:
 * - Ungültige Eingaben führen nicht sauber auf leere Defaults zurück.
 * - Gemischte oder leere Spaltenlisten bleiben fälschlich erhalten.
 * - Veraltete productCategoryIds/componentCategoryIds beeinflussen den neuen Resolver noch.
 *
 * Ziel:
 * Den clientseitigen Resolver für die neue Vorlaufliste-Spaltenkonfiguration absichern.
 */
import { describe, expect, it } from "vitest";

import { resolveVorlauflisteCategorySelection } from "../../../client/src/hooks/useSettings";

describe("useSettings: resolveVorlauflisteCategorySelection", () => {
  it("returns empty defaults for invalid input", () => {
    expect(resolveVorlauflisteCategorySelection(null)).toEqual({});
    expect(resolveVorlauflisteCategorySelection(undefined)).toEqual({});
    expect(resolveVorlauflisteCategorySelection([])).toEqual({});
    expect(resolveVorlauflisteCategorySelection("string")).toEqual({});
  });

  it("normalizes configured columns, hidden columns and widths", () => {
    const result = resolveVorlauflisteCategorySelection({
      columnOrder: [" amount ", "city", "amount", "product-5"],
      hiddenColumns: [" component-2 ", "component-2"],
      useShortCodes: false,
      columnWidths: {
        amount: 180,
        "product-5": 320,
        invalidSmall: 79,
        invalidFloat: 120.5,
      },
    });

    expect(result).toEqual({
      columnOrder: ["amount", "city", "product-5"],
      hiddenColumns: ["component-2"],
      useShortCodes: false,
      columnWidths: {
        amount: 180,
        "product-5": 320,
      },
    });
  });

  it("drops invalid configured arrays instead of partially keeping them", () => {
    const result = resolveVorlauflisteCategorySelection({
      columnOrder: ["amount", "", 3],
      hiddenColumns: [],
      useShortCodes: true,
    });

    expect(result).toEqual({
      columnOrder: undefined,
      hiddenColumns: undefined,
      useShortCodes: true,
      columnWidths: undefined,
    });
  });

  it("ignores legacy category id fields from the old payload shape", () => {
    const result = resolveVorlauflisteCategorySelection({
      productCategoryIds: [1, 2],
      componentCategoryIds: [3],
      useShortCodes: true,
    });

    expect(result).toEqual({
      columnOrder: undefined,
      hiddenColumns: undefined,
      useShortCodes: true,
      columnWidths: undefined,
    });
  });
});
