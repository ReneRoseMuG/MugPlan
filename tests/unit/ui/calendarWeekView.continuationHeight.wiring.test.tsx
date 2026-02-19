/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Segmenthoehe aus Startkarte in Wochenansicht weiterreichen
 *
 * Abgedeckte Regeln:
 * - CalendarWeekView misst Start-Segment-Hoehen pro Termin-ID.
 * - Continuation-Segmente erhalten die gemessene Hoehe mit konstantem Fallback.
 * - Hoehen-Cache wird bei Wochenwechsel zurueckgesetzt.
 *
 * Fehlerfaelle:
 * - Continuation-Hoehe bleibt von Spaltenbreite/Zeilenumbruch abhaengig.
 * - Veraltete Hoehenwerte aus vorheriger Woche.
 *
 * Ziel:
 * Verdrahtung der hoehenstabilen Weitergabe von Startkarten-Hoehen in der Wochenansicht absichern.
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

  it("passes measured/fallback continuation height and start segment ref into panel", () => {
    expect(source).toContain("const continuationHeightPx = appointmentHeightByIdRef.current.get(appointment.id)");
    expect(source).toContain("?? DEFAULT_CONTINUATION_HEIGHT_PX;");
    expect(source).toContain("continuationHeightPx={continuationHeightPx}");
    expect(source).toContain(": (node) => measureStartSegmentHeight(appointment.id, node)");
  });
});
