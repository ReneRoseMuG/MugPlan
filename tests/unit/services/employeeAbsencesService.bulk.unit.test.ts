/**
 * Test Scope:
 *
 * Feature: FT30 - Bulk-Ersatz bei Mitarbeiterabwesenheiten
 *
 * Abgedeckte Regeln:
 * - Der Ersatzmitarbeiter muss aktiv und verschieden vom ausfallenden Mitarbeiter sein.
 * - Nicht verfuegbare Ersatztermine werden als Skip statt als Globalfehler behandelt.
 * - Bereits zugewiesener Ersatz wird nur als Skip gezaehlt.
 * - updatedAppointmentCount zaehlt nur echte Termin-Aenderungen.
 *
 * Fehlerfaelle:
 * - Inaktive Ersatzmitarbeiter werden akzeptiert.
 * - Skip-Faelle erhoehen faelschlich die Anzahl aktualisierter Termine.
 *
 * Ziel:
 * Die Kernregeln des FT30-Bulk-Ersatzes isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEmployeeMock,
  getEmployeeAbsenceMock,
  listAffectedFutureAppointmentsTxMock,
  removeEmployeeFromAppointmentTxMock,
  addEmployeeToAppointmentTxMock,
  withAppointmentTransactionMock,
  previewEmployeeAvailabilityForDateRangeMock,
} = vi.hoisted(() => ({
  getEmployeeMock: vi.fn(),
  getEmployeeAbsenceMock: vi.fn(),
  listAffectedFutureAppointmentsTxMock: vi.fn(),
  removeEmployeeFromAppointmentTxMock: vi.fn(),
  addEmployeeToAppointmentTxMock: vi.fn(),
  withAppointmentTransactionMock: vi.fn(),
  previewEmployeeAvailabilityForDateRangeMock: vi.fn(),
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getEmployee: getEmployeeMock,
}));

vi.mock("../../../server/repositories/employeeAbsencesRepository", () => ({
  getEmployeeAbsence: getEmployeeAbsenceMock,
  listAffectedFutureAppointmentsTx: listAffectedFutureAppointmentsTxMock,
  removeEmployeeFromAppointmentTx: removeEmployeeFromAppointmentTxMock,
  addEmployeeToAppointmentTx: addEmployeeToAppointmentTxMock,
}));

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: withAppointmentTransactionMock,
}));

vi.mock("../../../server/services/employeeAvailabilityService", () => ({
  previewEmployeeAvailabilityForDateRange: previewEmployeeAvailabilityForDateRangeMock,
}));

import {
  EmployeeAbsencesError,
  bulkReplaceAffectedAppointments,
} from "../../../server/services/employeeAbsencesService";

describe.skip("FT30 unit: employeeAbsencesService bulk replacement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmployeeMock.mockResolvedValue({ id: 10, isActive: true });
    getEmployeeAbsenceMock.mockResolvedValue({
      id: 50,
      employeeId: 1,
      type: "vacation",
      from: "2099-09-01",
      until: "2099-09-03",
      version: 1,
    });
    withAppointmentTransactionMock.mockImplementation(async (handler: (tx: object) => Promise<unknown>) => handler({}));
    previewEmployeeAvailabilityForDateRangeMock.mockResolvedValue({
      availableEmployeeIds: [10],
      unavailableEmployees: [],
    });
  });

  it("rejects inactive replacement employees", async () => {
    getEmployeeMock
      .mockResolvedValueOnce({ id: 1, isActive: true })
      .mockResolvedValueOnce({ id: 10, isActive: false });

    await expect(bulkReplaceAffectedAppointments(1, 50, 10, "ADMIN")).rejects.toMatchObject<EmployeeAbsencesError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("skips replacement appointments that are unavailable instead of failing the full bulk replace", async () => {
    listAffectedFutureAppointmentsTxMock.mockResolvedValueOnce([
      {
        appointmentId: 700,
        startDate: new Date("2099-09-02T00:00:00Z"),
        endDate: new Date("2099-09-05T00:00:00Z"),
        tourName: null,
        replacementAlreadyAssigned: 0,
      },
    ]);
    previewEmployeeAvailabilityForDateRangeMock.mockResolvedValueOnce({
      availableEmployeeIds: [],
      unavailableEmployees: [{ id: 10, fullName: "Replacement", reason: "absence" }],
    });

    await expect(bulkReplaceAffectedAppointments(1, 50, 10, "ADMIN")).resolves.toEqual({
      absenceId: 50,
      updatedAppointmentCount: 0,
      skippedAlreadyAssignedCount: 0,
      skipped: [{ appointmentId: 700, reason: "EMPLOYEE_ABSENCE" }],
    });

    expect(removeEmployeeFromAppointmentTxMock).not.toHaveBeenCalled();
    expect(addEmployeeToAppointmentTxMock).not.toHaveBeenCalled();
  });

  it("counts only real updates and tracks already assigned replacements separately", async () => {
    listAffectedFutureAppointmentsTxMock.mockResolvedValueOnce([
      {
        appointmentId: 701,
        startDate: new Date("2099-09-02T00:00:00Z"),
        endDate: null,
        tourName: null,
        replacementAlreadyAssigned: 1,
      },
      {
        appointmentId: 702,
        startDate: new Date("2099-09-03T00:00:00Z"),
        endDate: null,
        tourName: null,
        replacementAlreadyAssigned: 0,
      },
    ]);

    await expect(bulkReplaceAffectedAppointments(1, 50, 10, "ADMIN")).resolves.toEqual({
      absenceId: 50,
      updatedAppointmentCount: 1,
      skippedAlreadyAssignedCount: 1,
      skipped: [],
    });

    expect(removeEmployeeFromAppointmentTxMock).toHaveBeenCalledTimes(2);
    expect(addEmployeeToAppointmentTxMock).toHaveBeenCalledTimes(1);
    expect(addEmployeeToAppointmentTxMock).toHaveBeenCalledWith({}, 702, 10);
  });
});
