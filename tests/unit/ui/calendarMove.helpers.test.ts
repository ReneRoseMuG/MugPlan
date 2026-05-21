/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Einfüge-/Verschiebeziele akzeptieren nur reguläre Touren.
 * - "Ohne Tour", "Parkplatz" und Abwesenheitstouren werden als Ziel ausgeschlossen.
 * - Vorschau-Auswahl übernimmt standardmäßig nur auswählbare Tour-KW-Mitarbeiter.
 *
 * Fehlerfälle:
 * - Ein Ausschneide-/Einfügevorgang könnte versehentlich auf "Ohne Tour", "Parkplatz" oder Abwesenheiten landen.
 * - Konflikt- oder direkt zugewiesene Mitarbeiter würden ungewollt vorausgewählt.
 */
import { describe, expect, it } from "vitest";

import {
  getDefaultPreviewSelection,
  isRegularCalendarMoveTarget,
  resolveCalendarMoveEmployeeCarryoverMode,
  shouldShowCalendarMoveResolutionMode,
  type AppointmentWeekEmployeePreviewResponse,
  type CalendarMoveRequest,
} from "../../../client/src/lib/calendar-move";

describe("calendar move helpers", () => {
  it("accepts only regular tour targets", () => {
    expect(isRegularCalendarMoveTarget(1, "Tour Alpha")).toBe(true);
    expect(isRegularCalendarMoveTarget(null, "Ohne Tour")).toBe(false);
    expect(isRegularCalendarMoveTarget(2, "Parkplatz")).toBe(false);
    expect(isRegularCalendarMoveTarget(3, "Abwesenheiten")).toBe(false);
  });

  it("preselects only selectable week-plan employees for appointment previews", () => {
    const preview: AppointmentWeekEmployeePreviewResponse = {
      isoYear: 2099,
      isoWeek: 3,
      hasWeekPlan: true,
      currentEmployeeIds: [4],
      items: [
        { employeeId: 1, employeeName: "A", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
        { employeeId: 2, employeeName: "B", status: "will_add", selectable: true, conflictReason: null, source: "available" },
        { employeeId: 3, employeeName: "C", status: "conflict", selectable: false, conflictReason: "Konflikt", source: "week_plan" },
        { employeeId: 4, employeeName: "D", status: "already_present", selectable: false, conflictReason: null, source: "current" },
      ],
    };

    expect(getDefaultPreviewSelection(preview)).toEqual([1]);
  });

  it("uses replace mode for tour or ISO week changes and keeps the mode choice for same-week additions", () => {
    const baseRequest: CalendarMoveRequest = {
      appointment: {
        id: 10,
        version: 1,
        projectId: 20,
        projectName: "Projekt",
        customerId: 30,
        customerName: "Kunde",
        customerNumber: "K-30",
        startDate: "2099-02-03",
        endDate: null,
        startTime: null,
        tourId: 1,
        tourName: "Tour A",
        employeeIds: [4],
        isCancelled: false,
        isLocked: false,
      },
      targetStartDate: "2099-02-04",
      targetTourId: 1,
      mode: "drag",
    };
    const preview: AppointmentWeekEmployeePreviewResponse = {
      isoYear: 2099,
      isoWeek: 6,
      hasWeekPlan: true,
      currentEmployeeIds: [4],
      items: [
        { employeeId: 5, employeeName: "Plan", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
      ],
    };

    expect(resolveCalendarMoveEmployeeCarryoverMode(baseRequest)).toBe("preserve");
    expect(shouldShowCalendarMoveResolutionMode(preview, baseRequest, "preserve")).toBe(true);
    expect(resolveCalendarMoveEmployeeCarryoverMode({
      ...baseRequest,
      targetTourId: 2,
    })).toBe("replace");
    expect(resolveCalendarMoveEmployeeCarryoverMode({
      ...baseRequest,
      targetStartDate: "2099-02-10",
    })).toBe("replace");
  });
});
