/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten Servicevertrag
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN und DISPONENT duerfen FT30 nutzen.
 * - Neue Abwesenheiten verlangen aktive Mitarbeiter und gueltige Zukunftszeiträume.
 * - Vergangene Abwesenheiten sind nicht mehr aender- oder loeschbar.
 * - Optimistic Locking liefert VERSION_CONFLICT.
 *
 * Fehlerfaelle:
 * - READER-Zugriff.
 * - Vergangene Startdaten.
 * - Inaktive Mitarbeiter bei Neuanlage.
 *
 * Ziel:
 * Die isolierte FT30-Service-Logik ohne Appointment-Bezug absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEmployeeMock,
  listEmployeeAbsencesMock,
  getEmployeeAbsenceMock,
  createEmployeeAbsenceMock,
  updateEmployeeAbsenceWithVersionMock,
  deleteEmployeeAbsenceWithVersionMock,
} = vi.hoisted(() => ({
  getEmployeeMock: vi.fn(),
  listEmployeeAbsencesMock: vi.fn(),
  getEmployeeAbsenceMock: vi.fn(),
  createEmployeeAbsenceMock: vi.fn(),
  updateEmployeeAbsenceWithVersionMock: vi.fn(),
  deleteEmployeeAbsenceWithVersionMock: vi.fn(),
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getEmployee: getEmployeeMock,
}));

vi.mock("../../../server/repositories/employeeAbsencesRepository", () => ({
  listEmployeeAbsences: listEmployeeAbsencesMock,
  getEmployeeAbsence: getEmployeeAbsenceMock,
  createEmployeeAbsence: createEmployeeAbsenceMock,
  updateEmployeeAbsenceWithVersion: updateEmployeeAbsenceWithVersionMock,
  deleteEmployeeAbsenceWithVersion: deleteEmployeeAbsenceWithVersionMock,
}));

import {
  EmployeeAbsencesError,
  createEmployeeAbsence,
  deleteEmployeeAbsence,
  listEmployeeAbsences,
  updateEmployeeAbsence,
} from "../../../server/services/employeeAbsencesService";

describe.skip("FT30 unit: employeeAbsencesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forbids READER access to list endpoint", async () => {
    await expect(listEmployeeAbsences(1, "READER")).rejects.toMatchObject<EmployeeAbsencesError>({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects create for inactive employee", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 7,
      isActive: false,
    });

    await expect(
      createEmployeeAbsence(
        7,
        { type: "vacation", from: "2099-01-05", until: "2099-01-06" },
        "ADMIN",
      ),
    ).rejects.toMatchObject<EmployeeAbsencesError>({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("rejects create when from lies in the past", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 8,
      isActive: true,
    });

    await expect(
      createEmployeeAbsence(
        8,
        { type: "vacation", from: "2000-01-01", until: "2000-01-02" },
        "ADMIN",
      ),
    ).rejects.toMatchObject<EmployeeAbsencesError>({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("creates absence for active employee with valid dates", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 9,
      isActive: true,
    });
    createEmployeeAbsenceMock.mockResolvedValueOnce({
      id: 10,
      employeeId: 9,
      type: "vacation",
      from: "2099-01-05",
      until: "2099-01-06",
      version: 1,
    });

    const result = await createEmployeeAbsence(
      9,
      { type: "vacation", from: "2099-01-05", until: "2099-01-06" },
      "DISPONENT",
    );

    expect(createEmployeeAbsenceMock).toHaveBeenCalledWith(9, {
      type: "vacation",
      from: "2099-01-05",
      until: "2099-01-06",
    });
    expect(result.version).toBe(1);
  });

  it("maps stale update to VERSION_CONFLICT", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 3,
      isActive: true,
    });
    getEmployeeAbsenceMock
      .mockResolvedValueOnce({
        id: 11,
        employeeId: 3,
        type: "vacation",
        from: "2099-01-08",
        until: "2099-01-09",
        version: 1,
      })
      .mockResolvedValueOnce({
        id: 11,
        employeeId: 3,
        type: "vacation",
        from: "2099-01-08",
        until: "2099-01-09",
        version: 2,
      });
    updateEmployeeAbsenceWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });

    await expect(
      updateEmployeeAbsence(3, 11, { version: 1, until: "2099-01-10" }, "ADMIN"),
    ).rejects.toMatchObject<EmployeeAbsencesError>({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("blocks update for already started absence", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 4,
      isActive: true,
    });
    getEmployeeAbsenceMock.mockResolvedValueOnce({
      id: 12,
      employeeId: 4,
      type: "sick",
      from: "2000-01-01",
      until: "2000-01-02",
      version: 1,
    });

    await expect(
      updateEmployeeAbsence(4, 12, { version: 1, until: "2099-01-10" }, "ADMIN"),
    ).rejects.toMatchObject<EmployeeAbsencesError>({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("blocks delete for already started absence", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 5,
      isActive: true,
    });
    getEmployeeAbsenceMock.mockResolvedValueOnce({
      id: 13,
      employeeId: 5,
      type: "sick",
      from: "2000-01-01",
      until: "2000-01-02",
      version: 1,
    });

    await expect(deleteEmployeeAbsence(5, 13, 1, "ADMIN")).rejects.toMatchObject<EmployeeAbsencesError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });
});
