/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Resolver fuer die neuen FT26-Range-Settings akzeptieren nur gueltige Tabs und KW-Werte.
 * - Die Produktionsplanung faellt fuer den neuen Selection-Key auf den Shortcode-Default zurueck.
 * - Der Legacy-Resolver bleibt fuer den Fallback auf reports.productVorlauf.selection erhalten.
 * - Die Tourenplan-Schriftgröße faellt auf Medium zurueck, wenn kein gueltiger Wert vorliegt.
 *
 * Fehlerfaelle:
 * - Ungueltige activeTab-/KW-Werte gelangen unveraendert ins Frontend.
 * - Der neue Selection-Resolver uebernimmt Altfelder oder verliert den Default.
 *
 * Ziel:
 * Die Frontend-Resolver der FT26-Report-Settings isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import {
  resolveLegacyProduktionsplanungSelection,
  resolveProduktionsplanungRangeConfig,
  resolveProduktionsplanungSelection,
  resolveTourenplanFontSize,
  resolveTourenplanPrintMode,
  resolveTourenplanRangeConfig,
  resolveVorlauflisteRangeConfig,
} from "../../../client/src/hooks/useSettings";

describe("useSettings FT26 report resolvers", () => {
  it("normalizes the vorlaufliste range config including legacy columns values and persisted dates", () => {
    expect(resolveVorlauflisteRangeConfig({
      activeTab: "columns",
      fromDate: "2026-04-06",
      toDate: "2026-05-08",
      kwStart: 11,
      weekCount: 4,
    })).toEqual({
      activeTab: "date",
      fromDate: "2026-04-06",
      toDate: "2026-05-08",
      kwStart: 11,
      weekCount: 4,
    });

    expect(resolveVorlauflisteRangeConfig({
      activeTab: "invalid",
      fromDate: "invalid",
      toDate: "2026/05/08",
      kwStart: 0,
      weekCount: 99,
    })).toEqual({
      activeTab: "date",
      fromDate: undefined,
      toDate: undefined,
      kwStart: undefined,
      weekCount: undefined,
    });
  });

  it("normalizes the produktionsplanung range config without allowing the columns tab", () => {
    expect(resolveProduktionsplanungRangeConfig({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 7,
      weekCount: 2,
    })).toEqual({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 7,
      weekCount: 2,
    });

    expect(resolveProduktionsplanungRangeConfig({
      activeTab: "columns",
      fromDate: "xx",
      toDate: "",
      kwStart: -1,
      weekCount: 100,
    })).toEqual({
      activeTab: "date",
      fromDate: undefined,
      toDate: undefined,
      kwStart: undefined,
      weekCount: undefined,
    });
  });

  it("keeps the new and legacy produktionsplanung selection resolvers separate", () => {
    expect(resolveProduktionsplanungSelection({ useShortCodes: true, productCategoryIds: [1] })).toEqual({
      useShortCodes: true,
    });
    expect(resolveProduktionsplanungSelection(null)).toEqual({
      useShortCodes: false,
    });

    expect(resolveLegacyProduktionsplanungSelection({
      productCategoryIds: [3, 3, 4],
      componentCategoryIds: [8],
      useShortCodes: true,
      sonderblockTagIds: [12, 12],
    })).toEqual({
      productCategoryIds: [3, 4],
      componentCategoryIds: [8],
      useShortCodes: true,
      sonderblockTagIds: [12],
    });
  });

  it("normalizes the tourenplan settings for range config and print mode", () => {
    expect(resolveTourenplanRangeConfig({
      activeTab: "calendarWeek",
      fromDate: "2026-04-14",
      toDate: "2026-04-28",
      kwStart: 16,
      weekCount: 3,
    })).toEqual({
      activeTab: "calendarWeek",
      fromDate: "2026-04-14",
      toDate: "2026-04-28",
      kwStart: 16,
      weekCount: 3,
    });

    expect(resolveTourenplanRangeConfig({
      activeTab: "invalid",
      fromDate: "14.04.2026",
      toDate: "",
      kwStart: 99,
      weekCount: 0,
    })).toEqual({
      activeTab: "date",
      fromDate: undefined,
      toDate: undefined,
      kwStart: undefined,
      weekCount: undefined,
    });

    expect(resolveTourenplanPrintMode("spardruck")).toBe("spardruck");
    expect(resolveTourenplanPrintMode("anything-else")).toBe("farbdruck");
    expect(resolveTourenplanFontSize("small")).toBe("small");
    expect(resolveTourenplanFontSize("large")).toBe("large");
    expect(resolveTourenplanFontSize("anything-else")).toBe("medium");
  });
});
