/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Spanning Tiles nutzen ein internes Tagesraster statt flexibler Gesamtbreite.
 * - Die linke Inhaltsflaeche bleibt auf genau eine Tages-Spalte fixiert.
 * - Die rechte Sperrflaeche belegt den restlichen gespannten Bereich.
 *
 * Fehlerfaelle:
 * - Zweitagestermine wachsen links breiter als eine Tageskarte.
 * - Die Sperrflaeche bleibt nur ein fixer Flex-Anteil statt tagesbezogenem Restbereich.
 *
 * Ziel:
 * Verdrahtung des internen Tile-Layouts fuer feste Inhaltsbreite regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekSpanningTile wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekSpanningTile.tsx"), "utf8");

  it("accepts spanColumns and uniform height wiring and builds an internal grid template from it", () => {
    expect(source).toContain("spanColumns: number;");
    expect(source).toContain("uniformHeightPx?: number | null;");
    expect(source).toContain("containerRef?: React.Ref<HTMLDivElement>;");
    expect(source).toContain("gridTemplateColumns: `repeat(${Math.max(1, spanColumns)}, minmax(0, 1fr))`");
    expect(source).toContain('...(uniformHeightPx && uniformHeightPx > 0 ? { height: `${uniformHeightPx}px` } : {}),');
    expect(source).toContain("ref={containerRef}");
  });

  it("pins content to the first inner day column", () => {
    expect(source).toContain('style={{ gridColumn: "1 / span 1" }}');
    expect(source).toContain('className="min-w-0 space-y-1.5 bg-white/90 p-2"');
  });

  it("lets the hatch area occupy the remaining spanned columns", () => {
    expect(source).toContain('gridColumn: `${Math.min(2, spanColumns)} / span ${Math.max(1, spanColumns - 1)}`');
    expect(source).toContain('backgroundColor: "rgba(241,245,249,0.45)"');
  });
});
