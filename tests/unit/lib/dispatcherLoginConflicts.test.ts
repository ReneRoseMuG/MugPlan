import { describe, expect, it } from "vitest";
import { buildDispatcherLoginConflicts } from "../../../client/src/lib/dispatcher-login-conflicts";
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
  it("splits parked appointments from missing-employee appointments and limits the login horizon", () => {
    const conflicts = buildDispatcherLoginConflicts([
      monitoringItem({ appointmentId: 1, startDate: "2026-05-04", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 2, startDate: "2026-05-25", triggerCodes: ["TR-01"] }),
      monitoringItem({ appointmentId: 3, startDate: "2026-04-01", triggerCodes: ["TR-02"] }),
      monitoringItem({ appointmentId: 4, startDate: "2026-05-05", triggerCodes: ["TR-01", "TR-02"] }),
    ], new Date(2026, 4, 4));

    expect(conflicts.withoutEmployees.map((item) => item.appointmentId)).toEqual([1, 4]);
    expect(conflicts.parked.map((item) => item.appointmentId)).toEqual([3, 4]);
  });
});
