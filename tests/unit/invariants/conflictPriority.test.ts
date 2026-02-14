import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: vi.fn(),
  getAppointmentTx: vi.fn(),
  getProjectTx: vi.fn(),
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
  });

  it("returns 409 BUSINESS_CONFLICT when overlap exists", async () => {
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(true);

    await expect(
      updateAppointment(
        101,
        {
          version: 5,
          projectId: 201,
          startDate: "2099-01-10",
          employeeIds: [1, 2],
        },
        "DISPONENT",
      ),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });
  });

  it("does not execute version-update path when business conflict already happened", async () => {
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(true);

    await expect(
      updateAppointment(
        101,
        {
          version: 5,
          projectId: 201,
          startDate: "2099-01-10",
          employeeIds: [1, 2],
        },
        "DISPONENT",
      ),
    ).rejects.toBeTruthy();

    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).not.toHaveBeenCalled();
  });

  it("surfaces deterministic appointment error type and code for conflict-priority case", async () => {
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(true);
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
    expect(error).toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });
    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
  });
});
