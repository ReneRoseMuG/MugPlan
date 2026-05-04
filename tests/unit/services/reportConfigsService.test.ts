/**
 * Test Scope:
 *
 * Feature: Report-Presets mit dynamischen Datumsbereichen
 *
 * Abgedeckte Regeln:
 * - Preset-Modus "Start aktuelle KW" startet am Montag der Referenz-KW.
 * - Preset-Modus "Start kommende KW" startet am Montag der folgenden KW.
 * - Die Anzahl der KW bestimmt das inklusive Enddatum.
 * - Statische Datumsbereiche bleiben unverändert.
 *
 * Ziel:
 * Die zentrale Datumsauflösung für alle Reports unabhängig von UI und API absichern.
 */
import { describe, expect, it } from "vitest";

import { resolveReportPresetRange } from "../../../server/services/reportConfigsService";

describe("resolveReportPresetRange", () => {
  it("resolves current calendar week ranges from the ISO week start", () => {
    const range = resolveReportPresetRange(
      { mode: "calendarWeek", start: "current", weeks: 2 },
      new Date("2026-05-06T12:00:00"),
    );

    expect(range).toEqual({
      fromDate: "2026-05-04",
      toDate: "2026-05-17",
    });
  });

  it("resolves next calendar week ranges with the configured number of weeks", () => {
    const range = resolveReportPresetRange(
      { mode: "calendarWeek", start: "next", weeks: 3 },
      new Date("2026-05-06T12:00:00"),
    );

    expect(range).toEqual({
      fromDate: "2026-05-11",
      toDate: "2026-05-31",
    });
  });

  it("keeps explicit date ranges unchanged", () => {
    const range = resolveReportPresetRange(
      { mode: "date", fromDate: "2026-06-02", toDate: "2026-06-05" },
      new Date("2026-05-06T12:00:00"),
    );

    expect(range).toEqual({
      fromDate: "2026-06-02",
      toDate: "2026-06-05",
    });
  });
});
