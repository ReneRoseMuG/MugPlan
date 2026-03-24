/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Vorlaufliste-URL enthaelt pro neuer Report-Erzeugung einen refreshKey als Cache-Buster.
 * - Filter und Paging werden weiterhin vollstaendig in die Request-URL uebernommen.
 *
 * Fehlerfälle:
 * - Die URL bleibt bei wiederholter Report-Erzeugung ohne eindeutigen Refresh-Parameter.
 * - Vorhandene Filter oder Paging-Parameter gehen beim URL-Aufbau verloren.
 *
 * Ziel:
 * Den frischen Vorlaufliste-Requestpfad ohne DOM-Abhaengigkeiten absichern.
 */
import { describe, expect, it } from "vitest";

import { buildVorlauflisteReportUrl } from "../../../client/src/components/ReportsPage";

describe("FT26 UI: ReportsPage refresh request", () => {
  it("adds a refreshKey while preserving the selected filters", () => {
    const url = buildVorlauflisteReportUrl({
      fromDate: "2026-03-24",
      toDate: "2026-03-31",
      productCategoryIds: [3, 7],
      componentCategoryIds: [4],
      useShortCodes: true,
      page: 2,
      pageSize: 100,
      refreshKey: 5,
    });

    expect(url).toContain("/api/reports/vorlaufliste?");
    expect(url).toContain("fromDate=2026-03-24");
    expect(url).toContain("toDate=2026-03-31");
    expect(url).toContain("productCategoryIds=3");
    expect(url).toContain("productCategoryIds=7");
    expect(url).toContain("componentCategoryIds=4");
    expect(url).toContain("useShortCodes=true");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=100");
    expect(url).toContain("refreshKey=5");
  });
});
