/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Update- und Delete-Pfade halten die vorgesehenen Locking-Regeln ein.
 * - Appointment-Fehlercodes werden fuer Locking-Faelle konsistent gemappt.
 *
 * Fehlerfaelle:
 * - Version- oder Delete-Konflikte werden falsch behandelt.
 *
 * Ziel:
 * Die zentralen Locking-Regeln rund um Appointment-Mutationen absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: vi.fn(),
  getAppointmentTx: vi.fn(),
  getProjectTx: vi.fn(),
  getConflictingEmployeesTx: vi.fn(),
  hasEmployeeDateOverlapTx: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
  deleteAppointmentWithVersionTx: vi.fn(),
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

  it("blocks update for non-admin on locked appointment with deterministic PAST_APPOINTMENT_READONLY", async () => {
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
    ).rejects.toMatchObject({ status: 409, code: "PAST_APPOINTMENT_READONLY" });

    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
  });

  it("blocks delete for non-admin on locked appointment with deterministic PAST_APPOINTMENT_READONLY", async () => {
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
    expect(error).toMatchObject({ status: 409, code: "PAST_APPOINTMENT_READONLY" });
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).not.toHaveBeenCalled();
  });

  it("blocks admin update on locked appointment with PAST_APPOINTMENT_READONLY", async () => {
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
    await expect(
      updateAppointment(
        203,
        {
          version: 5,
          projectId: 302,
          startDate: "2000-01-03",
          employeeIds: [],
        },
        "ADMIN",
      ),
    ).rejects.toMatchObject({ status: 409, code: "PAST_APPOINTMENT_READONLY" });
    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).not.toHaveBeenCalled();
  });

  it("blocks admin delete on locked appointment", async () => {
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
    await expect(deleteAppointment(204, 6, "ADMIN")).rejects.toMatchObject({
      status: 409,
      code: "PAST_APPOINTMENT_READONLY",
    });
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).not.toHaveBeenCalled();
  });
});
