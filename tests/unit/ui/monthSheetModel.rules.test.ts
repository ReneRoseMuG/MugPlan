/**
 * Test Scope:
 *
 * Bereich:
 * - Reine Monatsblatt-Matrix und Sichtfensterlogik
 *
 * Abgedeckte Regeln:
 * - Jede Monatsmatrix startet am Montag der ersten sichtbaren Woche und endet am Sonntag der letzten sichtbaren Woche.
 * - Monatsblätter unterstützen 4, 5 und 6 sichtbare Wochen inklusive Februar- und Jahreswechsel-Faellen.
 * - Problemmonate Maerz 2026 und April 2026 bleiben als explizite Regressionen driftfrei.
 * - Das feste 3-Monats-Sichtfenster ordnet Vor-, Anker- und Folgemonat deterministisch zu.
 *
 * Fehlerfaelle:
 * - Monatsraster uebernehmen implizite Offsets aus vorherigen Monaten.
 * - Sichtfenster oder Navigation verlieren bei Monats- oder Jahreswechseln die korrekte Reihenfolge.
 *
 * Ziel:
 * Die neue Monatsblatt-Datumslogik isoliert und deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { buildMonthSheetMatrix, buildMonthSheetWindow } from "../../../client/src/components/calendar/monthSheetModel";

function toDateKeys(matrix: ReturnType<typeof buildMonthSheetMatrix>) {
  return matrix.weeks.flatMap((week) => week.days.map((day) => day.dateKey));
}

describe("month sheet model rules", () => {
  it("builds a month that already starts on monday without shifting the visible start", () => {
    const matrix = buildMonthSheetMatrix(2027, 2);

    expect(format(matrix.visibleStart, "yyyy-MM-dd")).toBe("2027-02-01");
    expect(format(matrix.visibleEnd, "yyyy-MM-dd")).toBe("2027-02-28");
    expect(matrix.weeks).toHaveLength(4);
    expect(matrix.weeks[0].days[0].dateKey).toBe("2027-02-01");
    expect(matrix.weeks[3].days[6].dateKey).toBe("2027-02-28");
  });

  it("extends months that start mid-week back to monday and marks leading edge days outside the target month", () => {
    const matrix = buildMonthSheetMatrix(2026, 4);

    expect(format(matrix.visibleStart, "yyyy-MM-dd")).toBe("2026-03-30");
    expect(matrix.weeks[0].days[0].isCurrentMonth).toBe(false);
    expect(matrix.weeks[0].days[2].dateKey).toBe("2026-04-01");
    expect(matrix.weeks[0].days[2].isCurrentMonth).toBe(true);
  });

  it("extends months that end mid-week to sunday and marks trailing edge days outside the target month", () => {
    const matrix = buildMonthSheetMatrix(2026, 2);

    expect(format(matrix.visibleEnd, "yyyy-MM-dd")).toBe("2026-03-01");
    expect(matrix.weeks.at(-1)?.days.at(-1)?.dateKey).toBe("2026-03-01");
    expect(matrix.weeks.at(-1)?.days.at(-1)?.isCurrentMonth).toBe(false);
  });

  it("supports 4, 5 and 6 visible week months without hard-coded row counts", () => {
    expect(buildMonthSheetMatrix(2027, 2).weeks).toHaveLength(4);
    expect(buildMonthSheetMatrix(2026, 2).weeks).toHaveLength(5);
    expect(buildMonthSheetMatrix(2026, 3).weeks).toHaveLength(6);
  });

  it("keeps leap-year and non-leap-year february month boundaries exact", () => {
    const leapYear = buildMonthSheetMatrix(2024, 2);
    const nonLeapYear = buildMonthSheetMatrix(2025, 2);

    expect(toDateKeys(leapYear)).toContain("2024-02-29");
    expect(format(leapYear.monthEnd, "yyyy-MM-dd")).toBe("2024-02-29");
    expect(format(nonLeapYear.monthEnd, "yyyy-MM-dd")).toBe("2025-02-28");
    expect(toDateKeys(nonLeapYear)).not.toContain("2025-02-29");
  });

  it("keeps march 2026 and april 2026 as explicit regression months stable and deterministic", () => {
    const march = buildMonthSheetMatrix(2026, 3);
    const april = buildMonthSheetMatrix(2026, 4);

    expect(format(march.visibleStart, "yyyy-MM-dd")).toBe("2026-02-23");
    expect(format(march.visibleEnd, "yyyy-MM-dd")).toBe("2026-04-05");
    expect(format(april.visibleStart, "yyyy-MM-dd")).toBe("2026-03-30");
    expect(format(april.visibleEnd, "yyyy-MM-dd")).toBe("2026-05-03");
    expect(buildMonthSheetMatrix(2026, 3)).toEqual(march);
    expect(buildMonthSheetMatrix(2026, 4)).toEqual(april);
  });

  it("assigns iso week numbers and current-month markers per visible week cell", () => {
    const matrix = buildMonthSheetMatrix(2026, 3);

    expect(matrix.weeks[0].weekNumber).toBe(9);
    expect(matrix.weeks[1].weekNumber).toBe(10);
    expect(matrix.weeks[0].days[6].dateKey).toBe("2026-03-01");
    expect(matrix.weeks[0].days[6].isCurrentMonth).toBe(true);
    expect(matrix.weeks[0].days[0].isCurrentMonth).toBe(false);
  });

  it("marks today only on the actual current date inside the matrix", () => {
    const today = new Date();
    const matrix = buildMonthSheetMatrix(today.getFullYear(), today.getMonth() + 1);
    const todayKey = today.toISOString().slice(0, 10);
    const flaggedDays = matrix.weeks.flatMap((week) => week.days).filter((day) => day.isToday);

    expect(flaggedDays).toHaveLength(1);
    expect(flaggedDays[0].dateKey).toBe(todayKey);
  });

  it("builds a deterministic three-month window around the anchor month across year boundaries", () => {
    const decemberWindow = buildMonthSheetWindow(new Date("2026-12-15T12:00:00Z"));
    const januaryWindow = buildMonthSheetWindow(new Date("2027-01-10T12:00:00Z"));

    expect(decemberWindow.months.map((month) => month.monthKey)).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
    ]);
    expect(januaryWindow.months.map((month) => month.monthKey)).toEqual([
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
    expect(buildMonthSheetWindow(new Date("2026-12-15T12:00:00Z"))).toEqual(decemberWindow);
  });
});
