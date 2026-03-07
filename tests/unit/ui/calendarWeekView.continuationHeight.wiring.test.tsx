/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Startkartenhoehen nur noch fuer Eintageskarten verdrahten
 *
 * Abgedeckte Regeln:
 * - CalendarWeekView behaelt den Hoehen-Cache und den Reset pro Wochenwechsel.
 * - Echte Mehrtagestermine laufen nicht mehr ueber Continuation-Segmente.
 * - Eintageskarten bleiben Startsegmente mit Ref-Messung.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine werden weiterhin als Continuation-Segmente im DayCell-Stack gerendert.
 * - Veraltete Hoehenwerte aus vorheriger Woche.
 *
 * Ziel:
 * Verdrahtung des verbliebenen Hoehen-Caches und des neuen Startsegment-Pfads absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView continuation height wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("imports continuation fallback constant and keeps per-appointment height map", () => {
    expect(source).toContain("DEFAULT_CONTINUATION_HEIGHT_PX");
    expect(source).toContain("const appointmentHeightByIdRef = useRef<Map<number, number>>(new Map());");
  });

  it("resets height map on week reset key changes", () => {
    expect(source).toContain("appointmentHeightByIdRef.current.clear();");
    expect(source).toContain("}, [scrollResetKey]);");
  });

  it("keeps start-only panel wiring in day cells and removes continuation branching", () => {
    expect(source).toContain("continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}");
    expect(source).toContain('segment="start"');
    expect(source).toContain("containerRef={(node) => measureStartSegmentHeight(appointment.id, node)}");
    expect(source).not.toContain('segment={isContinuationSegment ? "continuation" : "start"}');
  });
});
