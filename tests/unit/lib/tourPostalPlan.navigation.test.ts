/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Eine leere max.-KW erzeugt keine Obergrenze.
 * - Eine gültige KW im laufenden ISO-Jahr wird auf die passende Wochenstartgrenze aufgelöst.
 * - Kleinere KWs als die aktuelle ISO-Woche werden als nächstes ISO-Jahr interpretiert.
 *
 * Fehlerfälle:
 * - Leere Eingaben blockieren die Navigation unnötig.
 * - Die max.-KW landet auf dem falschen Wochenstart.
 * - Jahreswechsel bei kleineren Ziel-KWs wird falsch berechnet.
 *
 * Ziel:
 * Die clientseitige Begrenzungs- und Paging-Logik des Tour-PLZ-Plans isoliert absichern.
 */
import { describe, expect, it } from "vitest";
import { format } from "date-fns";

import {
  buildTourPostalPlanWindow,
  resolveTourPostalPlanMaxWeekStartDate,
} from "../../../client/src/lib/tour-postal-plan";

describe("tourPostalPlan navigation helpers", () => {
  it("liefert ohne max.-KW keine Begrenzung", () => {
    expect(resolveTourPostalPlanMaxWeekStartDate("", "2026-04-14")).toBeNull();
  });

  it("berechnet die max.-KW im laufenden ISO-Jahr", () => {
    const result = resolveTourPostalPlanMaxWeekStartDate("18", "2026-04-14");

    expect(result ? format(result, "yyyy-MM-dd") : null).toBe("2026-04-27");
  });

  it("interpretiert kleinere KWs als Ziel im nächsten ISO-Jahr", () => {
    const result = resolveTourPostalPlanMaxWeekStartDate("12", "2026-04-14");

    expect(result ? format(result, "yyyy-MM-dd") : null).toBe("2027-03-22");
  });

  it("kappt das sichtbare Fenster an der max.-KW", () => {
    const currentWeekStart = new Date("2026-04-13T00:00:00.000Z");
    const maxWeekStartDate = new Date("2026-04-27T00:00:00.000Z");

    const windowRange = buildTourPostalPlanWindow({
      currentWeekStart,
      visibleWeekCount: 4,
      maxWeekStartDate,
    });

    expect(format(windowRange.fromDate, "yyyy-MM-dd")).toBe("2026-04-13");
    expect(format(windowRange.toDate, "yyyy-MM-dd")).toBe("2026-05-03");
  });
});
