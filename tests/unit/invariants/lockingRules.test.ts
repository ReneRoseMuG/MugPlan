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
  getAppointmentTagsByAppointmentIds: vi.fn(),
  getProjectTx: vi.fn(),
  getConflictingEmployeesTx: vi.fn(),
  hasEmployeeDateOverlapTx: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
  deleteAppointmentWithVersionTx: vi.fn(),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import {
  deleteAppointment,
  isAppointmentError,
  updateAppointment,
} from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);
const toursRepoMock = vi.mocked(toursRepository);

describe("PKG-02 Invariant: locking rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
    appointmentsRepoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
    toursRepoMock.getTours.mockResolvedValue([{ id: 88, name: "Parkplatz", color: "#D4537E", version: 1 }] as any);
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

  it("allows admin update on locked appointment while keeping relation validation", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 203,
      version: 5,
      projectId: 302,
      customerId: 11,
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

    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 203, employees: [] } as any);
    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 11,
        customerNumber: "C011",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    await expect(
      updateAppointment(
        203,
        {
          version: 5,
          projectId: null,
          customerId: 11,
          startDate: "2000-01-03",
          employeeIds: [],
        },
        "ADMIN",
      ),
    ).resolves.toBeTruthy();
    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        appointmentId: 203,
        data: expect.objectContaining({
          projectId: null,
          customerId: 11,
        }),
      }),
    );
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

    await expect(deleteAppointment(204, 6, "ADMIN")).resolves.toBeTruthy();
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).toHaveBeenCalled();
  });

  it("allows admin update for historical Parkplatz appointments", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 205,
      version: 7,
      projectId: null,
      tourId: 88,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-05T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: 11,
    } as any);
    appointmentsRepoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 205, employees: [] } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 11,
        customerNumber: "C011",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    await expect(
      updateAppointment(
        205,
        {
          version: 7,
          customerId: 11,
          tourId: 88,
          startDate: "2000-01-05",
          employeeIds: [],
        },
        "ADMIN",
      ),
    ).resolves.toBeTruthy();
  });

  it("allows delete for historical Parkplatz appointments", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 206,
      version: 8,
      projectId: 303,
      tourId: 88,
      title: "Existing",
      description: null,
      startDate: new Date("2000-01-06T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.deleteAppointmentWithVersionTx.mockResolvedValue({ kind: "deleted" });

    await expect(deleteAppointment(206, 8, "ADMIN")).resolves.toBeTruthy();
    expect(appointmentsRepoMock.deleteAppointmentWithVersionTx).toHaveBeenCalled();
  });
});
