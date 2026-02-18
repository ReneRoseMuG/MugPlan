/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Tour-Header-Counter
 * Use Case: UC FT03 - Tagesbezogene Termin-Counter in Lane-Headern
 *
 * Abgedeckte Regeln:
 * - CalendarWeekView leitet Tagescounts aus dayBuckets ab.
 * - Tagescounts werden im Header-Overlay pro Tagesspalte gerendert.
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

  it("renders per-day counter text only from computed dayAppointmentCounts in overlay", () => {
    expect(source).toContain("dayAppointmentCounts[dayIdx] > 0");
    expect(source).toContain("({dayAppointmentCounts[dayIdx]}) Termine");
    expect(source).toContain("data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}");
  });
});
