/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender ermittelt beim horizontalen Scrollen die dem Viewport naechste sichtbare Woche.
 * - Fehlende Wochen-Sections fallen ohne Drift auf die Basiswoche zurueck.
 *
 * Fehlerfaelle:
 * - Die Header-KW bleibt trotz Scrollen auf der Ausgangswoche stehen.
 * - Fehlende Section-Metriken fuehren zu einer falschen oder instabilen Zielwoche.
 *
 * Ziel:
 * Die sichtbarkeitsbasierte KW-Synchronisation des Wochen-Headers isoliert absichern.
 */
import { addWeeks, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { describe, expect, it } from "vitest";

import { resolveVisibleWeekStartFromScroll } from "../../../client/src/components/calendar/CalendarWeekView";

describe("CalendarWeekView - visible week sync", () => {
  const baseWeekStart = startOfWeek(new Date("2026-03-30T00:00:00Z"), { weekStartsOn: 1, locale: de });
  const weekStarts = [baseWeekStart, addWeeks(baseWeekStart, 1), addWeeks(baseWeekStart, 2)];

  it("picks the horizontally nearest week section for the header", () => {
    const visibleWeekStart = resolveVisibleWeekStartFromScroll({
      baseWeekStart,
      weekStarts,
      viewportMidpoint: 1450,
      getSectionMetrics: (weekKey) => {
        const metricsByWeekKey: Record<string, { offsetLeft: number; width: number }> = {
          "2026-03-30": { offsetLeft: 0, width: 1000 },
          "2026-04-06": { offsetLeft: 1000, width: 1000 },
          "2026-04-13": { offsetLeft: 2000, width: 1000 },
        };
        return metricsByWeekKey[weekKey] ?? null;
      },
    });

    expect(visibleWeekStart.toISOString()).toBe(weekStarts[1].toISOString());
  });

  it("falls back to the base week when no section metrics are available", () => {
    const visibleWeekStart = resolveVisibleWeekStartFromScroll({
      baseWeekStart,
      weekStarts,
      viewportMidpoint: 3200,
      getSectionMetrics: () => null,
    });

    expect(visibleWeekStart.toISOString()).toBe(baseWeekStart.toISOString());
  });
});
