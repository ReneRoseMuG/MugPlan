/**
 * Test Scope:
 *
 * Feature: FT03 - Monatskalender Tour-basierte Terminreihenfolge
 * Use Case: UC Monatsansicht sortiert Termine nach Tour-Index statt alphabetisch
 *
 * Abgedeckte Regeln:
 * - Sortierung priorisiert Tournamen im Schema "Tour <Zahl>" numerisch aufsteigend.
 * - Nicht-standardisierte Tournamen werden hinter nummerierten Touren alphabetisch einsortiert.
 * - Termine ohne Tourname werden zuletzt einsortiert.
 * - Tie-Breaker innerhalb gleicher Gruppe: Startzeit (HH:mm), dann ID.
 * - Monatsbalken nutzen einen festen horizontalen Innenabstand gegen Randkontakt und Rechtsueberstand.
 *
 * Fehlerfaelle:
 * - Lexikografische Sortierung setzt "Tour 10" vor "Tour 2".
 * - Nicht-standardisierte Tournamen verdrängen nummerierte Touren.
 * - Null-Touren erscheinen zwischen regulären Touren.
 *
 * - Monatsbalken ragen rechts aus der Tageskachel oder kleben an den Kachelraendern.
 *
 * Ziel:
 * Deterministische Absicherung der Monthly-Sortierlogik nach Tour-Index.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { compareAppointmentsByTourIndexThenTime } from "../../../client/src/lib/calendar-utils";

type ComparableAppointment = {
  id: number;
  tourName: string | null;
  startTime: string | null;
};

function appointment(input: ComparableAppointment) {
  return {
    ...input,
    startDate: "2099-01-01",
    endDate: null,
    version: 1,
    projectId: 1,
    projectName: "P",
    projectDescription: null,
    projectStatuses: [],
    tourId: null,
    tourColor: null,
    customer: {
      id: 1,
      customerNumber: "1",
      fullName: "Test",
      postalCode: "12345",
      city: "X",
    },
    employees: [],
    isLocked: false,
  };
}

describe("FT03 UI: month view sort by tour index wiring", () => {
  it("uses compareAppointmentsByTourIndexThenTime in CalendarMonthView", () => {
    const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarMonthView.tsx"), "utf8");

    expect(source).toContain("compareAppointmentsByTourIndexThenTime");
    expect(source).toContain(".sort(compareAppointmentsByTourIndexThenTime)");
  });

  it("sorts Tour 2 before Tour 10 and keeps non-standard and null tours at the end", () => {
    const items = [
      appointment({ id: 6, tourName: null, startTime: "08:00:00" }),
      appointment({ id: 5, tourName: "Alpha", startTime: "08:00:00" }),
      appointment({ id: 4, tourName: "Tour 10", startTime: "08:00:00" }),
      appointment({ id: 3, tourName: "Tour 2", startTime: "09:00:00" }),
      appointment({ id: 2, tourName: "Tour 2", startTime: "08:00:00" }),
      appointment({ id: 1, tourName: "Tour 2", startTime: "08:00:00" }),
    ];

    const sorted = items.sort((a, b) => compareAppointmentsByTourIndexThenTime(a as any, b as any));
    expect(sorted.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("applies horizontal inset to month lane bars to avoid overflow at tile edges", () => {
    const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarMonthView.tsx"), "utf8");

    expect(source).toContain("const MONTH_LANE_BAR_HORIZONTAL_INSET_PX = 4;");
    expect(source).toContain('left: `calc(${(startWeight / totalDayWeight) * 100}% + ${MONTH_LANE_BAR_HORIZONTAL_INSET_PX}px)`,');
    expect(source).toContain('width: `calc(${(spanWeight / totalDayWeight) * 100}% - ${MONTH_LANE_BAR_HORIZONTAL_INSET_PX * 2}px)`,');
  });
});
