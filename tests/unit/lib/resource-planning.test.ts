/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Week-Plan-Vorschläge werden standardmäßig vorausgewählt.
 * - Aktuelle Mitarbeiter mit Zielkonflikt bleiben abwählbar und werden bei additiver Übernahme entfernt, wenn sie nicht bestätigt werden.
 * - Der Preview-Entscheidungsmarker erkennt reine aktuelle Mitarbeiterkonflikte auch ohne Tour-KW-Planung.
 */
import { describe, expect, it } from "vitest";

import {
  buildEmployeeIdsFromResourcePreviewSelection,
  getDefaultResourcePreviewSelection,
  hasResourcePreviewDecision,
  type AppointmentResourcePreviewResponse,
} from "../../../client/src/lib/resource-planning";

describe("resource planning preview helpers", () => {
  it("selects only selectable week-plan additions by default", () => {
    const preview: AppointmentResourcePreviewResponse = {
      isoYear: 2099,
      isoWeek: 10,
      hasWeekPlan: true,
      currentEmployeeIds: [1],
      items: [
        { employeeId: 1, employeeName: "Aktuell", status: "current_only", selectable: false, conflictReason: null, source: "current" },
        { employeeId: 2, employeeName: "Plan", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
        { employeeId: 3, employeeName: "Frei", status: "will_add", selectable: true, conflictReason: null, source: "available" },
      ],
    };

    expect(getDefaultResourcePreviewSelection(preview)).toEqual([2]);
  });

  it("removes unconfirmed current conflicts from additive employee resolution", () => {
    const preview: AppointmentResourcePreviewResponse = {
      isoYear: 2099,
      isoWeek: 10,
      hasWeekPlan: false,
      currentEmployeeIds: [1, 2],
      items: [
        { employeeId: 1, employeeName: "Konflikt", status: "conflict", selectable: true, conflictReason: "EMPLOYEE_OVERLAP", source: "current" },
        { employeeId: 2, employeeName: "Bleibt", status: "current_only", selectable: false, conflictReason: null, source: "current" },
      ],
    };

    expect(buildEmployeeIdsFromResourcePreviewSelection(preview, [], "additive")).toEqual([2]);
    expect(buildEmployeeIdsFromResourcePreviewSelection(preview, [1], "additive")).toEqual([1, 2]);
  });

  it("keeps replace mode limited to already-present week employees and selected rows", () => {
    const preview: AppointmentResourcePreviewResponse = {
      isoYear: 2099,
      isoWeek: 10,
      hasWeekPlan: true,
      currentEmployeeIds: [1, 2],
      items: [
        { employeeId: 1, employeeName: "Alt", status: "current_only", selectable: false, conflictReason: null, source: "current" },
        { employeeId: 2, employeeName: "Schon da", status: "already_present", selectable: false, conflictReason: null, source: "week_plan" },
        { employeeId: 3, employeeName: "Plan", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
      ],
    };

    expect(buildEmployeeIdsFromResourcePreviewSelection(preview, [3], "replace")).toEqual([2, 3]);
  });

  it("treats pure current-employee conflicts as a resource decision", () => {
    expect(hasResourcePreviewDecision({
      isoYear: 2099,
      isoWeek: 10,
      hasWeekPlan: false,
      currentEmployeeIds: [1],
      items: [
        { employeeId: 1, employeeName: "Konflikt", status: "conflict", selectable: true, conflictReason: "EMPLOYEE_OVERLAP", source: "current" },
      ],
    })).toBe(true);
  });
});
