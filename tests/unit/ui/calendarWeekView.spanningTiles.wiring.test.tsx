/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Echte Mehrtagestermine werden als direkte Grid-Kinder mit Spalten-Span gerendert.
 * - Ein Overlay deckt beim Draggen die gesamte Lane-Hoehe als Drop-Ziel ab.
 * - Eintagestermine fuellen freie Grid-Zellen in der Tile-Zone vor dem Overflow.
 * - DayCells bleiben nur fuer echten Overflow in einer zusaetzlichen Grid-Row erhalten.
 * - Spanning Tiles nutzen eine eigene Komponente statt Continuation-Segmenten.
 *
 * Fehlerfaelle:
 * - Freie Luecken in der Tile-Zone bleiben trotz Eintagesterminen ungenutzt.
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
    expect(source).toContain("CalendarWeekSpanningTile");
    expect(source).toContain("WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX");
  });

  it("renders spanning appointments before day cells with explicit grid row separation", () => {
    expect(source).toContain("const tileRowCount = laneRenderData.tileRowCount;");
    expect(source).toContain("const needsDayCellRow = laneRenderData.needsDayCellRow;");
    expect(source).toContain("gridTemplateRows: laneGridTemplateRows");
    expect(source).toContain("const totalLaneRowCount = tileRowCount + (needsDayCellRow ? 1 : 0);");
    expect(source).toContain("<CalendarWeekSpanningTile");
    expect(source).toContain("spanColumns={columnSpan}");
    expect(source).toContain("gridColumn: `${startColumn} / span ${columnSpan}`");
    expect(source).toContain("gridRow: rowIndex + 1");
    expect(source).toContain("style={{ gridColumn: dayIdx + 1, gridRow: tileRowCount + 1, zIndex: 10 }}");
  });

  it("passes the global week display mode and visible day metadata into spanning tiles", () => {
    expect(source).toContain('const weekAppointmentDisplayMode = useSetting("calendar.weekAppointmentDisplayMode");');
    expect(source).toContain("const visibleStartDate = format(days[Math.max(0, startColumn - 1)], \"yyyy-MM-dd\");");
    expect(source).toContain("const visibleDayNumberStart =");
    expect(source).toContain('displayMode={weekAppointmentDisplayMode ?? "standard"}');
    expect(source).toContain("visibleStartDate={visibleStartDate}");
    expect(source).toContain("visibleDayNumberStart={visibleDayNumberStart}");
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
    expect(source).toContain("laneRenderData.singleDayGridItems.map(({ appointmentId, gridColumn, gridRow }) => {");
    expect(source).toContain("key={`week-single-grid-item-${appointment.id}`}");
    expect(source).toContain("style={{ gridColumn, gridRow, padding: \"0.5rem\", zIndex: 10 }}");
    expect(source).toContain("{hasLaneContent && needsDayCellRow ? tourLane.dayBuckets.map((dayBucket, dayIdx) => {");
    expect(source).toContain("laneRenderData.singleDayOverflowByBucket[dayIdx].map");
  });
});
