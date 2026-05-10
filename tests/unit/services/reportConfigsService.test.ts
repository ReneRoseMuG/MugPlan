/**
 * Test Scope:
 *
 * Feature: Report-Presets mit dynamischen Datumsbereichen
 *
 * Abgedeckte Regeln:
 * - Numeric Start KW 1 startet am Montag der kommenden Referenz-KW.
 * - Numeric Start KW größer 1 verschiebt den Start relativ zur Referenz-KW.
 * - Legacy-Werte "current" und "next" bleiben für bereits gespeicherte Presets auflösbar.
 * - Die Anzahl der KW bestimmt das inklusive Enddatum.
 * - Statische Datumsbereiche bleiben unverändert.
 *
 * Ziel:
 * Die zentrale Datumsauflösung für alle Reports unabhängig von UI und API absichern.
 */
import { describe, expect, it } from "vitest";

import { resolveReportPresetRange } from "../../../server/services/reportConfigsService";

describe("resolveReportPresetRange", () => {
  it("resolves numeric preset start 1 to the next ISO week start", () => {
    const range = resolveReportPresetRange(
      { mode: "calendarWeek", start: 1, weeks: 2 },
      new Date("2026-05-06T12:00:00"),
    );

    expect(range).toEqual({
      fromDate: "2026-05-11",
      toDate: "2026-05-24",
    });
  });

  it("resolves numeric preset starts as week offsets from the reference week", () => {
    const range = resolveReportPresetRange(
      { mode: "calendarWeek", start: 3, weeks: 1 },
      new Date("2026-05-06T12:00:00"),
    );

    expect(range).toEqual({
      fromDate: "2026-05-25",
      toDate: "2026-05-31",
    });
  });

  it("keeps legacy current and next calendar week ranges resolvable", () => {
    expect(resolveReportPresetRange(
      { mode: "calendarWeek", start: "current", weeks: 1 },
      new Date("2026-05-06T12:00:00"),
    )).toEqual({
      fromDate: "2026-05-04",
      toDate: "2026-05-10",
    });

    expect(resolveReportPresetRange(
      { mode: "calendarWeek", start: "next", weeks: 1 },
      new Date("2026-05-06T12:00:00"),
    )).toEqual({
      fromDate: "2026-05-11",
      toDate: "2026-05-17",
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
