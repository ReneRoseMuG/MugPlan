import { describe, expect, it } from "vitest";
import { buildMonitoringTriggerSummary } from "../../../client/src/lib/monitoring-ui";
import type { MonitoringListResponse } from "../../../shared/routes";

function item(appointmentId: number, triggerCodes: Array<"TR-01" | "TR-02">): MonitoringListResponse[number] {
  return {
    appointmentId,
    startDate: appointmentId === 1 ? "2026-04-01" : "2026-06-01",
    startTime: null,
    tourId: null,
    tourName: null,
    orderNumber: null,
    projectTitle: null,
    projectName: null,
    customerNumber: null,
    customerFirstName: null,
    customerLastName: null,
    customerName: null,
    employeeCount: 0,
    triggerCode: triggerCodes[0],
    triggerCodes,
    triggerName: triggerCodes.join(" + "),
  };
}

describe("monitoring trigger summary", () => {
  it("counts all supplied conflicts per trigger including historical and future entries", () => {
    const summary = buildMonitoringTriggerSummary([
      item(1, ["TR-01"]),
      item(2, ["TR-02"]),
      item(3, ["TR-01", "TR-02"]),
    ]);

    expect(summary.map((entry) => [entry.triggerCode, entry.count])).toEqual([
      ["TR-01", 2],
      ["TR-02", 2],
    ]);
  });
});
