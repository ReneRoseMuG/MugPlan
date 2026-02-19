/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Scroll-Restore
 * Use Case: UC Rueckkehr aus Terminformular in Wochenansicht
 *
 * Abgedeckte Regeln:
 * - Wochenansicht erfasst horizontalen Scroll-Offset beim Klick auf "Neuer Termin".
 * - Wochenansicht akzeptiert restoreScrollLeft als optionalen One-shot Restore-Wert.
 * - Nach Restore wird onScrollRestoreApplied zur Rueckmeldung an Home aufgerufen.
 *
 * Fehlerfaelle:
 * - Rueckkehr nach Termin-Speichern springt auf linken Rand statt im bisherigen Wochenoffset zu bleiben.
 * - Restore wird ohne Guard mit ungueltigem Wert ausgefuehrt.
 *
 * Ziel:
 * Verdrahtung fuer horizontales Scroll-Restore im Wochenkalender regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView scroll restore wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("adds restore props and tracks horizontal scroll container", () => {
    expect(source).toContain("restoreScrollLeft?: number | null;");
    expect(source).toContain("onScrollRestoreApplied?: () => void;");
    expect(source).toContain("const horizontalScrollContainerRef = useRef<HTMLDivElement | null>(null);");
    expect(source).toContain("ref={horizontalScrollContainerRef}");
  });

  it("captures scrollLeft on new appointment click and forwards it", () => {
    expect(source).toContain("const scrollLeft = horizontalScrollContainerRef.current?.scrollLeft ?? null;");
    expect(source).toContain("onNewAppointment?.(dayBucket.dateKey, { tourId: tourLane.tourId, scrollLeft });");
  });

  it("restores horizontal scroll position via one-shot effect", () => {
    expect(source).toContain('if (typeof restoreScrollLeft !== "number" || !Number.isFinite(restoreScrollLeft)) return;');
    expect(source).toContain("node.scrollLeft = Math.max(0, restoreScrollLeft);");
    expect(source).toContain("onScrollRestoreApplied?.();");
  });
});

