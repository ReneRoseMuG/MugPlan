/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TR-01 meldet unterbesetzte aktuelle oder zukuenftige Termine im konfigurierten Horizont.
 * - TR-02 meldet geparkte aktuelle oder zukuenftige Termine ueber den System-Tag Geparkt.
 * - Ein Termin mit beiden Triggern erscheint genau einmal mit kombinierter Triggeranzeige.
 * - Stornierte und historische Termine bleiben fuer beide Trigger ausgeschlossen.
 * - Summary-Aggregation gruppiert Treffer je Trigger stabil.
 *
 * Fehlerfaelle:
 * - Geparkt-Termine fehlen trotz System-Tag im Monitoring.
 * - Stornierte oder historische Termine tauchen trotzdem als Treffer auf.
 * - Reader erhalten Monitoring-Zugriff.
 *
 * Ziel:
 * Die FT31-Kernlogik des Monitoring-Service fuer beide Trigger isoliert absichern.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, RESERVED_VACANT_TAG_NAME } from "../../../shared/appointmentCancellation";

const hoisted = vi.hoisted(() => ({
  listAppointmentsForMonitoringMock: vi.fn(),
  getAppointmentTagsByAppointmentIdsMock: vi.fn(),
  getGlobalSettingValueMock: vi.fn(),
}));

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  listAppointmentsForMonitoring: hoisted.listAppointmentsForMonitoringMock,
  getAppointmentTagsByAppointmentIds: hoisted.getAppointmentTagsByAppointmentIdsMock,
}));

vi.mock("../../../server/services/userSettingsService", () => ({
  getGlobalSettingValue: hoisted.getGlobalSettingValueMock,
}));

import { MonitoringError, getMonitoringSummaryForRole, listMonitoringItems } from "../../../server/services/monitoringService";

describe("FT31 unit: monitoringService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2098-12-31T12:00:00.000Z"));
    vi.clearAllMocks();
    hoisted.getAppointmentTagsByAppointmentIdsMock.mockResolvedValue(new Map());
    hoisted.getGlobalSettingValueMock.mockImplementation(async (key: string) => {
      if (key === "monitoring.tr01.allAppointments") return false;
      if (key === "monitoring.tr01.horizonDays") return 7;
      if (key === "monitoring.tr01.minimumEmployees") return 2;
      return undefined;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns exactly one monitoring row per appointment with combined trigger information", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 11,
        startDate: "2099-01-01",
        startTime: "09:00:00",
        tourId: 7,
        tourName: "Nord",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1001",
        customerFirstName: "Anna",
        customerLastName: "Kunde",
        customerName: "Kunde A",
        employeeCount: 1,
      },
      {
        appointmentId: 12,
        startDate: "2099-01-02",
        startTime: null,
        tourId: 8,
        tourName: "Sued",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1002",
        customerFirstName: "Berta",
        customerLastName: "Kunde",
        customerName: "Kunde B",
        employeeCount: 3,
      },
      {
        appointmentId: 13,
        startDate: "2099-01-03",
        startTime: null,
        tourId: null,
        tourName: null,
        orderNumber: "ORD-13",
        projectTitle: "Projekt C",
        projectName: "Legacy Projekt C",
        customerNumber: "1003",
        customerFirstName: "Clara",
        customerLastName: "Kunde",
        customerName: "Kunde C",
        employeeCount: 0,
      },
    ]);
    hoisted.getAppointmentTagsByAppointmentIdsMock.mockResolvedValue(new Map([
      [12, [{ name: RESERVED_VACANT_TAG_NAME }]],
      [13, [{ name: RESERVED_VACANT_TAG_NAME }]],
    ]));

    const result = await listMonitoringItems("DISPONENT");

    expect(hoisted.listAppointmentsForMonitoringMock).toHaveBeenCalledWith({
      fromDate: new Date(2098, 11, 31),
      toDate: new Date(2099, 0, 6),
    });
    expect(result).toEqual([
      {
        appointmentId: 11,
        startDate: "2099-01-01",
        startTime: "09:00:00",
        tourId: 7,
        tourName: "Nord",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1001",
        customerFirstName: "Anna",
        customerLastName: "Kunde",
        customerName: "Kunde A",
        employeeCount: 1,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      },
      {
        appointmentId: 12,
        startDate: "2099-01-02",
        startTime: null,
        tourId: 8,
        tourName: "Sued",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1002",
        customerFirstName: "Berta",
        customerLastName: "Kunde",
        customerName: "Kunde B",
        employeeCount: 3,
        triggerCode: "TR-02",
        triggerCodes: ["TR-02"],
        triggerName: "Geparkt",
      },
      {
        appointmentId: 13,
        startDate: "2099-01-03",
        startTime: null,
        tourId: null,
        tourName: null,
        orderNumber: "ORD-13",
        projectTitle: "Projekt C",
        projectName: "Legacy Projekt C",
        customerNumber: "1003",
        customerFirstName: "Clara",
        customerLastName: "Kunde",
        customerName: "Kunde C",
        employeeCount: 0,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01", "TR-02"],
        triggerName: "Mindestzahl Mitarbeiter + Geparkt",
      },
    ]);
  });

  it("loads all future appointments when all-appointments is enabled", async () => {
    hoisted.getGlobalSettingValueMock.mockImplementation(async (key: string) => {
      if (key === "monitoring.tr01.allAppointments") return true;
      if (key === "monitoring.tr01.horizonDays") return 7;
      if (key === "monitoring.tr01.minimumEmployees") return 2;
      return undefined;
    });
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 50,
        startDate: "2099-02-15",
        startTime: null,
        tourId: null,
        tourName: null,
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1050",
        customerFirstName: null,
        customerLastName: "Kunde",
        customerName: "Kunde",
        employeeCount: 0,
      },
    ]);

    const result = await listMonitoringItems("ADMIN");

    expect(hoisted.listAppointmentsForMonitoringMock).toHaveBeenCalledWith({
      fromDate: new Date(2098, 11, 31),
      toDate: undefined,
    });
    expect(result).toEqual([
      expect.objectContaining({
        appointmentId: 50,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      }),
    ]);
  });

  it("skips cancelled and historical appointments for both triggers", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 61,
        startDate: "2098-12-30",
        startTime: null,
        tourId: 6,
        tourName: "Alt",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1061",
        customerFirstName: null,
        customerLastName: "Kunde Alt",
        customerName: "Kunde Alt",
        employeeCount: 0,
      },
      {
        appointmentId: 62,
        startDate: "2099-01-01",
        startTime: null,
        tourId: 6,
        tourName: "Storno",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1062",
        customerFirstName: null,
        customerLastName: "Kunde Storno",
        customerName: "Kunde Storno",
        employeeCount: 0,
      },
    ]);
    hoisted.getAppointmentTagsByAppointmentIdsMock.mockResolvedValue(new Map([
      [61, [{ name: RESERVED_VACANT_TAG_NAME }]],
      [62, [{ name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME }, { name: RESERVED_VACANT_TAG_NAME }]],
    ]));

    await expect(listMonitoringItems("ADMIN")).resolves.toEqual([]);
  });

  it("rejects readers", async () => {
    await expect(listMonitoringItems("LESER")).rejects.toMatchObject<MonitoringError>({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("builds a summary only for dispatcher or admin and groups by trigger", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 21,
        startDate: "2099-01-01",
        startTime: null,
        tourId: 9,
        tourName: "Nord",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1021",
        customerFirstName: null,
        customerLastName: "Kunde 21",
        customerName: "Kunde 21",
        employeeCount: 0,
      },
      {
        appointmentId: 22,
        startDate: "2099-01-02",
        startTime: null,
        tourId: 9,
        tourName: "Nord",
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1022",
        customerFirstName: null,
        customerLastName: "Kunde 22",
        customerName: "Kunde 22",
        employeeCount: 3,
      },
    ]);
    hoisted.getAppointmentTagsByAppointmentIdsMock.mockResolvedValue(new Map([
      [21, [{ name: RESERVED_VACANT_TAG_NAME }]],
      [22, [{ name: RESERVED_VACANT_TAG_NAME }]],
    ]));

    await expect(getMonitoringSummaryForRole("READER")).resolves.toBeUndefined();
    await expect(getMonitoringSummaryForRole("DISPATCHER")).resolves.toEqual({
      count: 2,
      triggers: [
        {
          triggerCode: "TR-01",
          triggerName: "Mindestzahl Mitarbeiter",
          count: 1,
          color: "#DC2626",
        },
        {
          triggerCode: "TR-02",
          triggerName: "Geparkt",
          count: 2,
          color: "#D4537E",
        },
      ],
    });
  });
});
