/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TR-01 meldet zukuenftige Termine innerhalb des konfigurierten Horizonts oder optional alle zukuenftigen Termine.
 * - Unterbesetzte Termine liefern Triggername, Problemtext und die aktuelle Monitoring-Item-Struktur stabil.
 * - Ohne Lese-Rolle bleibt das Ergebnis gesperrt.
 *
 * Fehlerfaelle:
 * - Vergangene oder ausserhalb des Horizonts liegende Termine tauchen im Monitoring auf.
 * - Reader kann Monitoring lesen.
 *
 * Ziel:
 * Die FT31-Kernlogik des Monitoring-Services isoliert absichern.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("returns only under-staffed appointments within the configured horizon", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 11,
        startDate: "2099-01-01",
        endDate: null,
        tourName: "Nord",
        employeeCount: 1,
      },
      {
        appointmentId: 12,
        startDate: "2099-01-02",
        endDate: null,
        tourName: "Sued",
        employeeCount: 2,
      },
      {
        appointmentId: 13,
        startDate: "2099-01-03",
        endDate: "2099-01-04",
        tourName: null,
        employeeCount: 0,
      },
    ]);

    const result = await listMonitoringItems("DISPONENT");

    expect(result).toEqual([
      {
        appointmentId: 11,
        startDate: "2099-01-01",
        startTime: undefined,
        tourName: "Nord",
        projectName: undefined,
        customerName: undefined,
        employeeCount: 1,
        triggerName: "TR-01 Ressourcenunterschreitung",
        problemDescription: "Nur 1 Mitarbeiter zugewiesen; mindestens 2 erforderlich.",
      },
      {
        appointmentId: 13,
        startDate: "2099-01-03",
        startTime: undefined,
        tourName: null,
        projectName: undefined,
        customerName: undefined,
        employeeCount: 0,
        triggerName: "TR-01 Ressourcenunterschreitung",
        problemDescription: "Nur 0 Mitarbeiter zugewiesen; mindestens 2 erforderlich.",
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
        endDate: null,
        tourName: null,
        employeeCount: 0,
      },
    ]);

    const result = await listMonitoringItems("ADMIN");

    expect(hoisted.listAppointmentsForMonitoringMock).toHaveBeenCalledWith({
      fromDate: new Date(2098, 11, 31),
      toDate: undefined,
    });
    expect(result).toEqual([
      {
        appointmentId: 50,
        startDate: "2099-02-15",
        startTime: undefined,
        tourName: null,
        projectName: undefined,
        customerName: undefined,
        employeeCount: 0,
        triggerName: "TR-01 Ressourcenunterschreitung",
        problemDescription: "Nur 0 Mitarbeiter zugewiesen; mindestens 2 erforderlich.",
      },
    ]);
  });

  it("rejects readers", async () => {
    await expect(listMonitoringItems("LESER")).rejects.toMatchObject<MonitoringError>({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("builds a summary only for dispatcher or admin", async () => {
    hoisted.listAppointmentsForMonitoringMock.mockResolvedValue([
      {
        appointmentId: 21,
        startDate: "2099-01-01",
        endDate: null,
        tourName: "Nord",
        employeeCount: 0,
      },
    ]);

    await expect(getMonitoringSummaryForRole("READER")).resolves.toBeUndefined();
    await expect(getMonitoringSummaryForRole("DISPATCHER")).resolves.toEqual({
      count: 1,
      triggerNames: ["TR-01 Ressourcenunterschreitung"],
    });
  });
});
