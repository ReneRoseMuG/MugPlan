import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: vi.fn(),
  getAppointmentTx: vi.fn(),
  getProjectTx: vi.fn(),
  getConflictingEmployeesTx: vi.fn(),
  getInactiveEmployeesByIdsTx: vi.fn(),
  hasEmployeeDateOverlapTx: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
}));

vi.mock("../../../server/repositories/projectStatusRepository", () => ({
  getProjectStatusesByProjectIds: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import { isAppointmentError, updateAppointment } from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);

describe("PKG-01 Invariant: conflict priority", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });

    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 101,
      version: 5,
      projectId: 201,
      tourId: null,
      title: "A",
      description: null,
      startDate: new Date("2099-01-10T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    appointmentsRepoMock.getProjectTx.mockResolvedValue({
      id: 201,
      name: "Project 201",
    });
    appointmentsRepoMock.getInactiveEmployeesByIdsTx.mockResolvedValue([]);
  });

  it("throws EMPLOYEE_OVERLAP_CONFLICT with conflictEmployees metadata when overlap exists", async () => {
    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([{ id: 1, fullName: "Emp One" }]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });

    let error: unknown;
    try {
      await updateAppointment(
        101,
        {
          version: 5,
          projectId: 201,
          startDate: "2099-01-10",
          employeeIds: [1, 2],
        },
        "DISPONENT",
      );
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({
      status: 409,
      code: "EMPLOYEE_OVERLAP_CONFLICT",
      conflictEmployees: [{ id: 1, fullName: "Emp One" }],
    });
    expect(appointmentsRepoMock.getConflictingEmployeesTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ startTimeHour: null }),
    );
  });

  it("aborts before version-update path and employee writes when overlap exists", async () => {
    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([{ id: 1, fullName: "Emp One" }]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 101, projectId: 201, employees: [] } as any);

    await expect(updateAppointment(
      101,
      {
        version: 5,
        projectId: 201,
        startDate: "2099-01-10",
        employeeIds: [1, 2],
      },
      "DISPONENT",
    )).rejects.toMatchObject({ code: "EMPLOYEE_OVERLAP_CONFLICT" });

    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).not.toHaveBeenCalled();
  });

  it("still surfaces deterministic VERSION_CONFLICT if optimistic lock fails", async () => {
    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "version_conflict" });

    let error: unknown;
    try {
      await updateAppointment(
        101,
        {
          version: 5,
          projectId: 201,
          startDate: "2099-01-10",
          employeeIds: [1, 2, 2, Number.NaN],
        },
        "DISPONENT",
      );
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("uses hour-based overlap key for timed updates", async () => {
    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 101, projectId: 201, employees: [] } as any);

    await updateAppointment(
      101,
      {
        version: 5,
        projectId: 201,
        startDate: "2099-01-10",
        startTime: "10:45:00",
        employeeIds: [1],
      },
      "DISPONENT",
    );

    expect(appointmentsRepoMock.getConflictingEmployeesTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ startTimeHour: 10 }),
    );
  });
});
