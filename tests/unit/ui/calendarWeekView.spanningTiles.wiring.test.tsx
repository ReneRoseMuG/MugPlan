/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Echte Mehrtagestermine werden als direkte Grid-Kinder mit Spalten-Span gerendert.
 * - Ein Overlay deckt beim Draggen die gesamte Lane-Hoehe als Drop-Ziel ab.
 * - DayCells bleiben Inhalte in einer festen Grid-Row unterhalb der Tiles.
 * - Spanning Tiles nutzen eine eigene Komponente statt Continuation-Segmenten.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine landen weiter im DayCell-Stack.
 * - Drop-Targets decken nicht die sichtbare Tile-Flaeche ab.
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
    expect(source).toContain("const hasSingleDayAppointments = laneRenderData.singleDayAppointmentIdsByBucket.some(");
    expect(source).toContain("const needsDayCellRow = hasSingleDayAppointments || tileRowCount === 0;");
    expect(source).toContain("gridTemplateRows: laneGridTemplateRows");
    expect(source).toContain("const totalLaneRowCount = tileRowCount + (needsDayCellRow ? 1 : 0);");
    expect(source).toContain("<CalendarWeekSpanningTile");
    expect(source).toContain("spanColumns={columnSpan}");
    expect(source).toContain("gridColumn: `${startColumn} / span ${columnSpan}`");
    expect(source).toContain("gridRow: rowIndex + 1");
    expect(source).toContain("style={{ gridColumn: dayIdx + 1, gridRow: tileRowCount + 1, zIndex: 10 }}");
  });

  it("adds a drag-only lane overlay for drop targets across the full grid height", () => {
    expect(source).toContain("draggedAppointmentId !== null ? (");
    expect(source).toContain('className="absolute inset-0 grid z-20"');
    expect(source).toContain("data-testid={`week-day-drop-overlay-${format(day, \"yyyy-MM-dd\")}-lane-${tourLane.laneKey}`}");
    expect(source).toContain("void handleDrop(event, day);");
  });

  it("keeps day cells for single-day appointments and renders a full-column background layer", () => {
    expect(source).toContain("key={`week-lane-column-background-${tourLane.laneKey}-${dayIdx}`}");
    expect(source).toContain('className={isWeekend ? "bg-slate-200/45" : "bg-white/80"}');
    expect(source).toContain("gridRow: `1 / span ${totalLaneRowCount}`");
    expect(source).toContain("{needsDayCellRow ? tourLane.dayBuckets.map((dayBucket, dayIdx) => {");
    expect(source).toContain("laneRenderData.singleDayAppointmentIdsByBucket[dayIdx].map");
  });
});
