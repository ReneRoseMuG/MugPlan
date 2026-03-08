/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Spanning Tiles nutzen ein internes Tagesraster mit durchgehendem Header ueber alle sichtbaren Tage.
 * - Der globale Darstellungsmodus schaltet zwischen Standard-, zentriertem und gefuelltem Body-Layout.
 * - Standard behaelt eine linke Inhalts-Spalte, zentriert setzt gleiche Sperrflaechen links/rechts und gefuellt streckt den Body ueber das ganze Tile.
 *
 * Fehlerfaelle:
 * - Mehrtagesheader zeigt weiter nur eine kompakte Ein-Tages-Kopfzeile.
 * - Zentriert/Gefuellt bleiben ohne sichtbaren Effekt auf den Tile-Body.
 *
 * Ziel:
 * Verdrahtung des internen Tile-Layouts fuer feste Inhaltsbreite regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekSpanningTile wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekSpanningTile.tsx"), "utf8");

  it("accepts spanColumns, display mode and visible day metadata for multi-day header rendering", () => {
    expect(source).toContain("spanColumns: number;");
    expect(source).toContain('displayMode: "standard" | "compact" | "detail";');
    expect(source).toContain("visibleStartDate: string;");
    expect(source).toContain("visibleDayNumberStart: number;");
    expect(source).toContain("uniformHeightPx?: number | null;");
    expect(source).toContain("containerRef?: React.Ref<HTMLDivElement>;");
    expect(source).toContain("gridTemplateColumns: `repeat(${Math.max(1, spanColumns)}, minmax(0, 1fr))`");
    expect(source).toContain('gridTemplateRows: "auto 1fr"');
    expect(source).toContain('...(uniformHeightPx && uniformHeightPx > 0 ? { height: `${uniformHeightPx}px` } : {}),');
    expect(source).toContain("ref={containerRef}");
  });

  it("builds a spanning header across all visible days with per-day labels", () => {
    expect(source).toContain("const headerDays = Array.from({ length: visibleColumns }, (_, dayOffset) => {");
    expect(source).toContain('dayLabel: `Tag ${visibleDayNumberStart + dayOffset}`');
    expect(source).toContain('data-testid={`week-spanning-tile-header-${appointment.id}`}');
    expect(source).toContain('gridColumn: `1 / span ${visibleColumns}`');
    expect(source).toContain('className="grid grid-cols-[auto_1fr_auto] items-center gap-2"');
    expect(source).toContain('className="inline-flex items-center justify-center"');
    expect(source).toContain('className="truncate text-center"');
    expect(source).toContain('className="shrink-0 text-right justify-self-end"');
  });

  it("keeps the standard mode as one content column plus hatched remainder", () => {
    expect(source).toContain('data-testid={`week-spanning-tile-body-standard-${appointment.id}`}');
    expect(source).toContain('style={{ gridColumn: "1 / span 1", gridRow: 2 }}');
    expect(source).toContain('gridColumn: `${Math.min(2, spanColumns)} / span ${Math.max(1, spanColumns - 1)}`');
    expect(source).toContain('backgroundColor: "rgba(241,245,249,0.45)"');
  });

  it("supports centered and filled body layouts from the global week display mode", () => {
    expect(source).toContain('const isCenteredMode = effectiveDisplayMode === "compact";');
    expect(source).toContain('const isFilledMode = effectiveDisplayMode === "detail";');
    expect(source).toContain('data-testid={`week-spanning-tile-body-centered-${appointment.id}`}');
    expect(source).toContain('style={{ width: bodyColumnWidth }}');
    expect(source).toContain('data-testid={`week-spanning-tile-body-filled-${appointment.id}`}');
    expect(source).toContain('style={{ gridColumn: `1 / span ${visibleColumns}`, gridRow: 2 }}');
  });
});
