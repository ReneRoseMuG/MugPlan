/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Add-Vorschau mappt konfliktfreie, bereits belegte und overlap-geblockte Termine stabil auf Checkbox-Zustaende.
 * - Remove-Preview zeigt nur zukuenftige Tour-Termine, auf denen der Mitarbeiter tatsaechlich eingetragen ist.
 *
 * Fehlerfaelle:
 * - Konfliktgruende werden falsch priorisiert oder verlieren ihre Markierung.
 * - Remove-Preview listet Termine ohne aktuelle Mitarbeiterzuordnung weiterhin auf.
 *
 * Ziel:
 * Die FT04-Vorschau-Logik des Services isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getTourMock: vi.fn(),
  getEmployeeMock: vi.fn(),
  listSidebarAppointmentsByTourFromDateMock: vi.fn(),
  getAppointmentEmployeesByAppointmentIdsMock: vi.fn(),
  withAppointmentTransactionMock: vi.fn(),
  getConflictingEmployeesTxMock: vi.fn(),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTour: hoisted.getTourMock,
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getEmployee: hoisted.getEmployeeMock,
}));

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  listSidebarAppointmentsByTourFromDate: hoisted.listSidebarAppointmentsByTourFromDateMock,
  getAppointmentEmployeesByAppointmentIds: hoisted.getAppointmentEmployeesByAppointmentIdsMock,
  withAppointmentTransaction: hoisted.withAppointmentTransactionMock,
  getConflictingEmployeesTx: hoisted.getConflictingEmployeesTxMock,
}));

import {
  previewAddEmployeeCascade,
  previewRemoveEmployeeCascade,
} from "../../../server/services/tourEmployeesService";

describe("FT04 unit: tourEmployeesService preview flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getTourMock.mockResolvedValue({ id: 4, name: "Tour 4", color: "#225588" });
    hoisted.getEmployeeMock.mockResolvedValue({
      id: 9,
      fullName: "Ada Lovelace",
      isActive: true,
      tourId: null,
      version: 3,
    });
    hoisted.listSidebarAppointmentsByTourFromDateMock.mockResolvedValue([
      {
        appointment: {
          id: 101,
          startDate: new Date("2099-07-01T00:00:00"),
          endDate: null,
          startTime: null,
        },
        tour: { name: "Tour 4" },
      },
      {
        appointment: {
          id: 102,
          startDate: new Date("2099-07-02T00:00:00"),
          endDate: null,
          startTime: null,
        },
        tour: { name: "Tour 4" },
      },
      {
        appointment: {
          id: 103,
          startDate: new Date("2099-07-03T00:00:00"),
          endDate: null,
          startTime: null,
        },
        tour: { name: "Tour 4" },
      },
    ]);
    hoisted.withAppointmentTransactionMock.mockImplementation(async (handler: (tx: object) => Promise<unknown>) => handler({}));
  });

  it("maps eligible, already assigned and overlap-blocked appointments for add preview", async () => {
    hoisted.getAppointmentEmployeesByAppointmentIdsMock.mockResolvedValue([
      {
        appointmentId: 102,
        employee: { id: 9, fullName: "Ada Lovelace" },
      },
      {
        appointmentId: 103,
        employee: { id: 12, fullName: "Grace Hopper" },
      },
    ]);
    hoisted.getConflictingEmployeesTxMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, fullName: "Ada Lovelace" }]);

    const preview = await previewAddEmployeeCascade(4, 9);

    expect(preview).toEqual([
      {
        appointmentId: 101,
        startDate: "2099-07-01",
        endDate: null,
        tourName: "Tour 4",
        customerNumber: null,
        customerName: null,
        projectName: null,
        orderNumber: null,
        currentEmployees: [],
        eligible: true,
        conflictReason: null,
      },
      {
        appointmentId: 102,
        startDate: "2099-07-02",
        endDate: null,
        tourName: "Tour 4",
        customerNumber: null,
        customerName: null,
        projectName: null,
        orderNumber: null,
        currentEmployees: [{ id: 9, fullName: "Ada Lovelace" }],
        eligible: false,
        conflictReason: "ALREADY_ASSIGNED",
      },
      {
        appointmentId: 103,
        startDate: "2099-07-03",
        endDate: null,
        tourName: "Tour 4",
        customerNumber: null,
        customerName: null,
        projectName: null,
        orderNumber: null,
        currentEmployees: [{ id: 12, fullName: "Grace Hopper" }],
        eligible: false,
        conflictReason: "EMPLOYEE_OVERLAP",
      },
    ]);
  });

  it("filters remove preview down to future appointments that still contain the employee", async () => {
    hoisted.getEmployeeMock.mockResolvedValue({
      id: 9,
      fullName: "Ada Lovelace",
      isActive: true,
      tourId: 4,
      version: 3,
    });
    hoisted.getAppointmentEmployeesByAppointmentIdsMock.mockResolvedValue([
      {
        appointmentId: 101,
        employee: { id: 9, fullName: "Ada Lovelace" },
      },
      {
        appointmentId: 103,
        employee: { id: 12, fullName: "Grace Hopper" },
      },
    ]);

    const preview = await previewRemoveEmployeeCascade(4, 9);

    expect(preview).toEqual([
      {
        appointmentId: 101,
        startDate: "2099-07-01",
        endDate: null,
        tourName: "Tour 4",
        customerNumber: null,
        customerName: null,
        projectName: null,
        orderNumber: null,
        currentEmployees: [{ id: 9, fullName: "Ada Lovelace" }],
        eligible: true,
        conflictReason: null,
      },
    ]);
  });
});
