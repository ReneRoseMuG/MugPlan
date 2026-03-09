/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Lane-weite Kartenhoehe ueber gemessene Maximalhoehe vereinheitlichen
 *
 * Abgedeckte Regeln:
 * - CalendarWeekView misst Hoehen lane-weit und speichert pro Woche/Lane die Maximalhoehe.
 * - Eintageskarten und Spanning Tiles erhalten dieselbe lane-weite Hoehe.
 * - Hoehen-Cache wird bei Wochenwechsel und Datenreload zurueckgesetzt.
 *
 * Fehlerfaelle:
 * - Karten einer Lane bleiben unterschiedlich hoch.
 * - Veraltete Hoehenwerte aus vorheriger Woche.
 *
 * Ziel:
 * Verdrahtung der lane-weiten Hoehenvereinheitlichung in der Wochenansicht absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView continuation height wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("imports continuation fallback constant and keeps a lane-based height map", () => {
    expect(source).toContain("DEFAULT_CONTINUATION_HEIGHT_PX");
    expect(source).toContain("WEEK_CARD_FOOTER_SAFE_SPACE_PX");
    expect(source).toContain("WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX");
    expect(source).toContain("const laneHeightByKeyRef = useRef<Map<string, number>>(new Map());");
  });

  it("resets lane height map on week reset key changes and appointment reloads", () => {
    expect(source).toContain("laneHeightByKeyRef.current.clear();");
    expect(source).toContain("}, [appointments, scrollResetKey]);");
  });

  it("measures lane card heights and passes a shared uniform height to tiles and day panels", () => {
    expect(source).toContain("const laneHeightKey = `${weekKey}:${tourLane.laneKey}`;");
    expect(source).toContain("const laneUniformHeightPx = laneHeightByKeyRef.current.get(laneHeightKey) ?? null;");
    expect(source).toContain("const measureLaneCardHeight = (laneHeightKey: string, node: HTMLDivElement | null, footerSafeSpacePx = 0) => {");
    expect(source).toContain("Math.round(node.getBoundingClientRect().height) - footerSafeSpacePx");
    expect(source).toContain("uniformHeightPx={laneUniformHeightPx}");
    expect(source).toContain("measureLaneCardHeight(laneHeightKey, node, WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX)");
    expect(source).toContain("measureLaneCardHeight(laneHeightKey, node, WEEK_CARD_FOOTER_SAFE_SPACE_PX)");
    expect(source).toContain("continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}");
    expect(source).toContain('segment="start"');
  });
});
