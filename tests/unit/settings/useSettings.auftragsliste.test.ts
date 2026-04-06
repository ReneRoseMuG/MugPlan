/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragsliste normalisiert den Selection-Key auf eindeutige Kategorie-IDs und den Shortcode-Default.
 * - Die Auftragsliste normalisiert den Range-Key auf gueltige Tabs und Datum-/KW-Werte.
 *
 * Fehlerfaelle:
 * - Ungueltige Kategorie-IDs oder Range-Werte gelangen unveraendert ins Frontend.
 * - Der Selection-Resolver verliert den Default fuer useShortCodes.
 *
 * Ziel:
 * Die Frontend-Resolver der neuen Auftragslisten-Settings isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import {
  resolveAuftragslisteRangeConfig,
  resolveAuftragslisteSelection,
} from "../../../client/src/hooks/useSettings";

describe("useSettings auftragsliste resolvers", () => {
  it("normalizes the selection payload", () => {
    expect(resolveAuftragslisteSelection({
      productCategoryIds: [3, 3, 4],
      componentCategoryIds: [7, 7, 8],
      useShortCodes: true,
    })).toEqual({
      productCategoryIds: [3, 4],
      componentCategoryIds: [7, 8],
      useShortCodes: true,
    });

    expect(resolveAuftragslisteSelection(null)).toEqual({
      productCategoryIds: [],
      componentCategoryIds: [],
      useShortCodes: false,
    });
  });

  it("normalizes the range config payload", () => {
    expect(resolveAuftragslisteRangeConfig({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 12,
      weekCount: 2,
    })).toEqual({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 12,
      weekCount: 2,
    });

    expect(resolveAuftragslisteRangeConfig({
      activeTab: "columns",
      fromDate: "x",
      kwStart: -1,
      weekCount: 70,
    })).toEqual({
      activeTab: "date",
      fromDate: undefined,
      toDate: undefined,
      kwStart: undefined,
      weekCount: undefined,
    });
  });
});
