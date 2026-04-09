/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ISO-Wochenfenster werden auch ueber Jahresgrenzen korrekt aufgeloest.
 * - Laufende und vergangene Wochen gelten serverseitig als gesperrt.
 * - Zukuenftige Wochen bleiben editierbar.
 *
 * Fehlerfaelle:
 * - ISO-Jahreswechsel liefert falsche Wochenstarts oder -enden.
 * - Der Week-Lock unterscheidet nicht sauber zwischen aktueller und zukuenftiger Woche.
 *
 * Ziel:
 * Die zentralen Wochenregeln des neuen Wochenplan-Services isoliert absichern.
 */
import { describe, expect, it } from "vitest";

import {
  isWeekLocked,
  resolveIsoWeekWindow,
} from "../../../server/services/tourWeekEmployeesService";

describe("tourWeekEmployeesService week rules", () => {
  it("resolves ISO week bounds across the year boundary", () => {
    const previousYearWeek = resolveIsoWeekWindow(2026, 53);
    const nextYearWeek = resolveIsoWeekWindow(2027, 1);

    expect(previousYearWeek.weekStartDate).toBe("2026-12-28");
    expect(previousYearWeek.weekEndDate).toBe("2027-01-03");
    expect(nextYearWeek.weekStartDate).toBe("2027-01-04");
    expect(nextYearWeek.weekEndDate).toBe("2027-01-10");
  });

  it("treats current and past weeks as locked", () => {
    expect(isWeekLocked(2026, 15, "2026-04-09")).toBe(true);
    expect(isWeekLocked(2026, 14, "2026-04-09")).toBe(true);
  });

  it("keeps future weeks editable", () => {
    expect(isWeekLocked(2026, 16, "2026-04-09")).toBe(false);
  });
});
