/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TR-01 meldet unterbesetzte Termine aus der vollstaendigen Monitoring-Konfliktmenge.
 * - TR-02 meldet geparkte Termine ueber den System-Tag Geparkt.
 * - Ein Termin mit beiden Triggern erscheint genau einmal mit kombinierter Triggeranzeige.
 * - Stornierte Termine bleiben fuer beide Trigger ausgeschlossen.
 * - Leser sind serverseitig vom Monitoring ausgeschlossen.
 * - Summary-Aggregation gruppiert Treffer je Trigger stabil.
 *
 * Fehlerfaelle:
 * - Geparkt-Termine fehlen trotz System-Tag im Monitoring.
 * - Stornierte Termine tauchen trotzdem als Treffer auf.
 * - Leser erhalten wieder Monitoring-Zugriff.
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

import { getMonitoringSummaryForRole, listMonitoringItems } from "../../../server/services/monitoringService";

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
        tourColor: null,
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
        tourColor: null,
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
        tourColor: null,
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

    expect(hoisted.listAppointmentsForMonitoringMock).toHaveBeenCalledWith({});
    expect(result).toEqual([
      {
        appointmentId: 11,
        startDate: "2099-01-01",
        startTime: "09:00:00",
        tourId: 7,
        tourName: "Nord",
        tourColor: null,
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
        tourColor: null,
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
        tourColor: null,
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

  it("loads the full conflict set independent of the old all-appointments horizon switch", async () => {
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
        tourColor: null,
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

    expect(hoisted.listAppointmentsForMonitoringMock).toHaveBeenCalledWith({});
    expect(result).toEqual([
      expect.objectContaining({
        appointmentId: 50,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      }),
    ]);
  });

  it("skips cancelled appointments but keeps historical parked conflicts in the full monitoring set", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 61,
        startDate: "2098-12-30",
        startTime: null,
        tourId: 6,
        tourName: "Alt",
        tourColor: null,
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
        tourColor: null,
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

    await expect(listMonitoringItems("ADMIN")).resolves.toEqual([
      expect.objectContaining({
        appointmentId: 61,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01", "TR-02"],
        triggerName: "Mindestzahl Mitarbeiter + Geparkt",
      }),
    ]);
  });

  it("blocks readers from listing monitoring items", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 71,
        startDate: "2099-01-02",
        startTime: null,
        tourId: 6,
        tourName: "Reader",
        tourColor: null,
        orderNumber: null,
        projectTitle: null,
        projectName: null,
        customerNumber: "1071",
        customerFirstName: null,
        customerLastName: "Reader Kunde",
        customerName: "Reader Kunde",
        employeeCount: 0,
      },
    ]);

    await expect(listMonitoringItems("LESER")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(hoisted.listAppointmentsForMonitoringMock).not.toHaveBeenCalled();
  });

  it("builds a summary only for dispatcher or admin and groups by trigger", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 21,
        startDate: "2099-01-01",
        startTime: null,
        tourId: 9,
        tourName: "Nord",
        tourColor: null,
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
        tourColor: null,
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
