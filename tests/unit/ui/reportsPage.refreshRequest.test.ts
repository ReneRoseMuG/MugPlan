/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Vorlaufliste-URL enthält pro neuer Report-Erzeugung einen refreshKey als Cache-Buster.
 * - Filter und Paging werden weiterhin vollständig in die Listen-URL übernommen.
 * - Der separate Druckpfad bleibt vom Listen-Paging getrennt.
 *
 * Fehlerfälle:
 * - Die URL bleibt bei wiederholter Report-Erzeugung ohne eindeutigen Refresh-Parameter.
 * - Vorhandene Filter oder Paging-Parameter gehen beim URL-Aufbau verloren.
 * - Der Druckpfad übernimmt versehentlich den refreshKey oder Paging-Parameter.
 *
 * Ziel:
 * Den frischen Vorlaufliste-Requestpfad ohne DOM-Abhängigkeiten absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildVorlauflistePrintPreviewUrl,
  buildVorlauflisteReportUrl,
} from "../../../client/src/components/ReportsPage";

describe("FT26 UI: ReportsPage refresh request", () => {
  it("adds a refreshKey while preserving the selected filters", () => {
    const url = buildVorlauflisteReportUrl({
      fromDate: "2026-03-24",
      toDate: "2026-03-31",
      useShortCodes: true,
      page: 2,
      pageSize: 100,
      refreshKey: 5,
    });

    expect(url).toContain("/api/reports/vorlaufliste?");
    expect(url).toContain("fromDate=2026-03-24");
    expect(url).toContain("toDate=2026-03-31");
    expect(url).toContain("useShortCodes=true");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=100");
    expect(url).toContain("refreshKey=5");
  });

  it("keeps the print-preview URL free from list-specific parameters", () => {
    const url = buildVorlauflistePrintPreviewUrl({
      fromDate: "2026-03-24",
      toDate: "2026-03-31",
      useShortCodes: true,
    });

    expect(url).toContain("/api/reports/vorlaufliste/print-preview?");
    expect(url).toContain("fromDate=2026-03-24");
    expect(url).toContain("toDate=2026-03-31");
    expect(url).toContain("useShortCodes=true");
    expect(url).not.toContain("page=");
    expect(url).not.toContain("pageSize=");
    expect(url).not.toContain("refreshKey=");
  });
});


