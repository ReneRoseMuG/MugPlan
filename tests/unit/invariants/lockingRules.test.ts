import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: vi.fn(),
  getAppointmentTx: vi.fn(),
  getProjectTx: vi.fn(),
  hasEmployeeDateOverlapTx: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
  deleteAppointmentWithVersionTx: vi.fn(),
}));

vi.mock("../../../server/repositories/projectStatusRepository", () => ({
  getProjectStatusesByProjectIds: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import {
  deleteAppointment,
  isAppointmentError,
  updateAppointment,
} from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);

describe("PKG-02 Invariant: locking rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
  });

  it("blocks update for non-admin on locked appointment with deterministic LOCK_VIOLATION", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 201,
      version: 3,
      projectId: 301,
      tourId: null,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-01T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(
      updateAppointment(
        201,
        {
          version: 3,
          projectId: 301,
          startDate: "2000-01-01",
          employeeIds: [],
        },
        "DISPONENT",
      ),
    ).rejects.toMatchObject({ status: 403, code: "LOCK_VIOLATION" });

    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
  });

  it("blocks delete for non-admin on locked appointment with deterministic LOCK_VIOLATION", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 202,
      version: 4,
      projectId: 301,
      tourId: null,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-02T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    let error: unknown;
    try {
      await deleteAppointment(202, 4, "DISPONENT");
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({ status: 403, code: "LOCK_VIOLATION" });
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).not.toHaveBeenCalled();
  });

  it("allows admin update on locked appointment and proceeds to optimistic-lock update path", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 203,
      version: 5,
      projectId: 302,
      tourId: null,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-03T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.getProjectTx.mockResolvedValue({ id: 302, name: "Project 302" });
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(false);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({
      id: 203,
      version: 6,
      projectId: 302,
      title: "Project 302",
      description: null,
      startDate: new Date("2000-01-03T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      employees: [],
    } as any);

    const result = await updateAppointment(
      203,
      {
        version: 5,
        projectId: 302,
        startDate: "2000-01-03",
        employeeIds: [],
      },
      "ADMIN",
    );

    expect(result).toMatchObject({ id: 203, projectId: 302 });
    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).toHaveBeenCalledOnce();
  });

  it("allows admin delete on locked appointment", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 204,
      version: 6,
      projectId: 302,
      tourId: null,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-04T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.deleteAppointmentWithVersionTx.mockResolvedValue({ kind: "deleted" });

    const result = await deleteAppointment(204, 6, "ADMIN");

    expect(result).toMatchObject({ id: 204 });
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).toHaveBeenCalledOnce();
  });
});
