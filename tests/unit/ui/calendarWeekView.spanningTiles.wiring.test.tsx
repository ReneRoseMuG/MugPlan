/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Echte Mehrtagestermine werden als direkte Grid-Kinder mit Spalten-Span gerendert.
 * - DayCells bleiben eigene Drop-Targets in einer festen Grid-Row unterhalb der Tiles.
 * - Spanning Tiles nutzen eine eigene Komponente statt Continuation-Segmenten.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine landen weiter im DayCell-Stack.
 * - Drop-Targets verschwinden oder werden auf Tiles verlagert.
 *
 * Ziel:
 * Verdrahtung des neuen Spanning-Tile-Renderpfads in der Wochenansicht absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView spanning tile wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("imports spanning tile helpers and component", () => {
    expect(source).toContain("getAppointmentStackPriority");
    expect(source).toContain("getWeekAppointmentGridSpan");
    expect(source).toContain("getWeekAppointmentGridStartColumn");
    expect(source).toContain('import { CalendarWeekSpanningTile } from "./CalendarWeekSpanningTile";');
  });

  it("renders spanning appointments before day cells with explicit grid row separation", () => {
    expect(source).toContain("const laneGridTemplateRows = tileRowCount > 0");
    expect(source).toContain("gridTemplateRows: laneGridTemplateRows");
    expect(source).toContain("<CalendarWeekSpanningTile");
    expect(source).toContain("gridColumn: `${startColumn} / span ${columnSpan}`");
    expect(source).toContain("gridRow: rowIndex + 1");
    expect(source).toContain("style={{ gridColumn: dayIdx + 1, gridRow: tileRowCount + 1 }}");
  });

  it("keeps day cell drop targets while rendering only single-day appointments inside them", () => {
    expect(source).toContain("laneRenderData.singleDayAppointmentIdsByBucket[dayIdx].map");
    expect(source).toContain("onDragOver={(event) => event.preventDefault()}");
    expect(source).toContain("void handleDrop(event, day);");
  });
});
