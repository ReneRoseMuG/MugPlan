import { describe, expect, it } from "vitest";
import {
  buildDispatcherLoginConflictRange,
  buildDispatcherLoginConflicts,
  groupMonitoringItemsByIsoWeek,
} from "../../../client/src/lib/dispatcher-login-conflicts";
import type { MonitoringListResponse } from "../../../shared/routes";

function monitoringItem(params: {
  appointmentId: number;
  startDate: string;
  triggerCodes: Array<"TR-01" | "TR-02">;
}): MonitoringListResponse[number] {
  return {
    appointmentId: params.appointmentId,
    startDate: params.startDate,
    startTime: null,
    tourId: null,
    tourName: null,
    tourColor: null,
    orderNumber: null,
    projectTitle: `Projekt ${params.appointmentId}`,
    projectName: `Projekt ${params.appointmentId}`,
    customerNumber: null,
    customerFirstName: null,
    customerLastName: null,
    customerName: null,
    employeeCount: 0,
    triggerCode: params.triggerCodes[0],
    triggerCodes: params.triggerCodes,
    triggerName: params.triggerCodes.join(" + "),
  };
}

describe("dispatcher login conflicts", () => {
  it("splits parked appointments from missing-employee appointments and keeps the default login horizon", () => {
    const conflicts = buildDispatcherLoginConflicts([
      monitoringItem({ appointmentId: 1, startDate: "2026-05-04", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 2, startDate: "2026-05-25", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 3, startDate: "2026-04-01", triggerCodes: ["TR-02"] }),
      monitoringItem({ appointmentId: 4, startDate: "2026-05-05", triggerCodes: ["TR-01", "TR-02"] }),
    ], new Date(2026, 4, 4));

    expect(conflicts.withoutEmployees.map((item) => item.appointmentId)).toEqual([1, 4]);
    expect(conflicts.parked.map((item) => item.appointmentId)).toEqual([3, 4]);
    expect(conflicts.withoutEmployeesRange).toMatchObject({
      lookaheadWeeks: 2,
      fromDate: "2026-05-04",
      toDate: "2026-05-24",
      label: "Diese KW + 2 weitere KWs",
      dateRangeLabel: "04.05.26 - 24.05.26 (3 KWs)",
    });
  });

  it("applies the user lookahead weeks only to missing-employee appointments", () => {
    const conflicts = buildDispatcherLoginConflicts([
      monitoringItem({ appointmentId: 1, startDate: "2026-05-04", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 2, startDate: "2026-05-25", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 3, startDate: "2026-05-25", triggerCodes: ["TR-02"] }),
    ], new Date(2026, 4, 4), 3);

    expect(conflicts.withoutEmployees.map((item) => item.appointmentId)).toEqual([1, 2]);
    expect(conflicts.parked.map((item) => item.appointmentId)).toEqual([3]);
    expect(conflicts.withoutEmployeesRange.toDate).toBe("2026-05-31");
  });

  it("groups conflicts by ISO week across year boundaries", () => {
    const groups = groupMonitoringItemsByIsoWeek([
      monitoringItem({ appointmentId: 1, startDate: "2026-12-31", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 2, startDate: "2027-01-04", triggerCodes: ["TR-01"] }),
    ], new Date(2026, 11, 28));

    expect(groups.map((group) => ({
      key: group.key,
      label: group.label,
      dateRangeLabel: group.dateRangeLabel,
      appointmentIds: group.items.map((item) => item.appointmentId),
    }))).toEqual([
      {
        key: "2026-53",
        label: "KW 53 / 2026",
        dateRangeLabel: "28.12.26 - 03.01.27",
        appointmentIds: [1],
      },
      {
        key: "2027-01",
        label: "KW 01 / 2027",
        dateRangeLabel: "04.01.27 - 10.01.27",
        appointmentIds: [2],
      },
    ]);
  });

  it("normalizes invalid lookahead values to the default range", () => {
    expect(buildDispatcherLoginConflictRange(new Date(2026, 4, 4), true).lookaheadWeeks).toBe(2);
    expect(buildDispatcherLoginConflictRange(new Date(2026, 4, 4), 99).lookaheadWeeks).toBe(2);
  });
});
