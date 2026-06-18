import { describe, expect, it } from "vitest";
import {
  buildAppointmentAssignIneligibleReasons,
  formatCompactWeekDayHeader,
  isWeekPlanningLockedForCalendarRole,
  mapAppointmentPreviewToPickerEmployees,
  resolveInitialAppointmentEmployeeSelection,
} from "../../../client/src/components/calendar/CalendarWeekView";

describe("CalendarWeekView compact day header", () => {
  it("formats German weekday and month labels", () => {
    expect(formatCompactWeekDayHeader(new Date("2026-04-27T00:00:00Z"))).toBe("Mo 27 Apr");
    expect(formatCompactWeekDayHeader(new Date("2026-03-03T00:00:00Z"))).toBe("Di 3 Mär");
  });

  it("omits the month label for the compact fallback", () => {
    expect(formatCompactWeekDayHeader(new Date("2026-12-31T00:00:00Z"), false)).toBe("Do 31");
  });
});

describe("CalendarWeekView appointment employee selection", () => {
  it("preselects only selectable Tour-KW employees that are not already assigned", () => {
    expect(resolveInitialAppointmentEmployeeSelection([
      {
        employeeId: 11,
        employeeName: "Mia Woche",
        status: "will_add",
        selectable: true,
        conflictReason: null,
        source: "week_plan",
      },
      {
        employeeId: 12,
        employeeName: "Mia Frei",
        status: "will_add",
        selectable: true,
        conflictReason: null,
        source: "available",
      },
      {
        employeeId: 13,
        employeeName: "Mia Bestand",
        status: "already_present",
        selectable: false,
        conflictReason: null,
        source: "week_plan",
      },
    ])).toEqual([11]);
  });

  it("does not preselect conflict-free fallback employees without Tour-KW plan", () => {
    expect(resolveInitialAppointmentEmployeeSelection([
      {
        employeeId: 21,
        employeeName: "Mia Frei",
        status: "will_add",
        selectable: true,
        conflictReason: null,
        source: "available",
      },
    ])).toEqual([]);
  });
});

describe("CalendarWeekView Tour-KW lock roles", () => {
  it("keeps past weeks locked for admins and dispatchers", () => {
    expect(isWeekPlanningLockedForCalendarRole("2026-04-27", "2026-05-04", true)).toBe(true);
    expect(isWeekPlanningLockedForCalendarRole("2026-04-27", "2026-05-04", false)).toBe(true);
  });

  it("unlocks the current week for roles that can manage week planning", () => {
    expect(isWeekPlanningLockedForCalendarRole("2026-05-04", "2026-05-04", true)).toBe(false);
    expect(isWeekPlanningLockedForCalendarRole("2026-05-04", "2026-05-04", false)).toBe(true);
  });
});

type AppointmentPreviewItemForTest = Parameters<typeof buildAppointmentAssignIneligibleReasons>[0][number];

describe("CalendarWeekView appointment assign picker mapping", () => {
  const previewItems: AppointmentPreviewItemForTest[] = [
    { employeeId: 11, employeeName: "Mia Woche", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
    { employeeId: 12, employeeName: "Tom Konflikt", status: "conflict", selectable: false, conflictReason: "EMPLOYEE_OVERLAP", source: "available" },
    { employeeId: 13, employeeName: "Bea Bestand", status: "already_present", selectable: false, conflictReason: null, source: "week_plan" },
  ];

  it("hält jeden Preview-Mitarbeiter im Picker sichtbar (kein stilles Ausblenden)", () => {
    const employees = mapAppointmentPreviewToPickerEmployees(previewItems);
    expect(employees.map((employee) => employee.id)).toEqual([11, 12, 13]);
    expect(employees.map((employee) => employee.fullName)).toEqual(["Mia Woche", "Tom Konflikt", "Bea Bestand"]);
    expect(employees.every((employee) => employee.isActive)).toBe(true);
  });

  it("sperrt nur nicht zuweisbare Mitarbeiter mit einem lesbaren Grund", () => {
    expect(buildAppointmentAssignIneligibleReasons(previewItems)).toEqual({
      12: "Überschneidung mit bestehendem Termin",
      13: "Bereits diesem Termin zugewiesen",
    });
  });

  it("lässt zuweisbare Mitarbeiter frei (kein Sperreintrag)", () => {
    expect(buildAppointmentAssignIneligibleReasons(previewItems)[11]).toBeUndefined();
  });
});
