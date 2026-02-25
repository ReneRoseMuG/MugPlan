/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Tour-Header-Counter
 * Use Case: UC FT03 - Tagesbezogene Termin-Counter in Lane-Headern
 *
 * Abgedeckte Regeln:
 * - CalendarWeekView leitet Tagescounts aus dayBuckets ab.
 * - Tagescounts werden im Header-Overlay pro Tagesspalte gerendert.
 * - Tageskopfzellen rendern rechteckige Tour-Counter-Badges je Tag aus denselben Lane-Daten.
 * - Die bestehende Header-Integration bleibt an die Wochen-Grid-Logik gekoppelt.
 *
 * Fehlerfaelle:
 * - Fehlende Counter-Ausgabe im Tages-Overlay.
 * - Abweichende Count-Quelle statt dayBuckets.length.
 *
 * Ziel:
 * Verdrahtung der Counter-Daten aus der Wochen-Lane-Struktur in den Header absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView tour header counters wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("derives dayAppointmentCounts from lane dayBuckets", () => {
    expect(source).toContain("const dayAppointmentCounts = tourLane.dayBuckets.map((bucket) => bucket.appointments.length);");
  });

  it("derives dayHeaderBadges from lane dayBuckets and sorts by tourId", () => {
    expect(source).toContain("const dayHeaderBadges = Array.from({ length: 7 }, (_, dayIdx) =>");
    expect(source).toContain("count: lane.dayBuckets[dayIdx]?.appointments.length ?? 0");
    expect(source).toContain(".filter((entry) => entry.count > 0)");
    expect(source).toContain("return a.tourId - b.tourId;");
  });

  it("renders per-day counter text only from computed dayAppointmentCounts in overlay", () => {
    expect(source).toContain("dayAppointmentCounts[dayIdx] > 0");
    expect(source).toContain("({dayAppointmentCounts[dayIdx]}) Termine");
    expect(source).toContain("data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}");
  });

  it("renders day header badge row and per-tour badge test ids", () => {
    expect(source).toContain("data-testid={`week-day-tour-badges-${dayKey}`}");
    expect(source).toContain("data-testid={`week-day-tour-badge-${dayKey}-${badge.laneKey}`}");
    expect(source).toContain("rounded-md");
  });
});
