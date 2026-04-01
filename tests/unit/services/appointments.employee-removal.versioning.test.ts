/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter-Entfernen aus Terminen erwartet eine gueltige Appointment-Version.
 * - Der Pfad bump't die Appointment-Version vor dem eigentlichen Join-Delete atomar.
 * - Stornierte Termine bleiben fuer den Remove-Pfad gesperrt.
 *
 * Fehlerfaelle:
 * - Veraltete Appointment-Version liefert keinen VERSION_CONFLICT.
 * - Ungueltige Version wird nicht als VALIDATION_ERROR abgewiesen.
 *
 * Ziel:
 * Den versionierten Remove-Pfad fuer appointment_employee isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  getAppointment: vi.fn(),
  getAppointmentTx: vi.fn(),
  withAppointmentTransaction: vi.fn(),
  bumpAppointmentVersionTx: vi.fn(),
  deleteAppointmentEmployeeTx: vi.fn(),
  getAppointmentTagsByAppointmentIds: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import { removeEmployeeFromAppointment } from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);

describe("FT01 unit: appointment employee removal versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
    appointmentsRepoMock.bumpAppointmentVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
  });

  it("removes an employee when the appointment version matches", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({ id: 51 } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({ id: 51 } as any);

    const result = await removeEmployeeFromAppointment(51, 9, 4, "DISPONENT");

    expect(result).toEqual({ found: true });
    expect(appointmentsRepoMock.bumpAppointmentVersionTx).toHaveBeenCalledWith(expect.anything(), {
      appointmentId: 51,
      expectedVersion: 4,
    });
    expect(appointmentsRepoMock.deleteAppointmentEmployeeTx).toHaveBeenCalledWith(expect.anything(), 51, 9);
  });

  it("returns VERSION_CONFLICT when the appointment version is stale", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({ id: 52 } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({ id: 52 } as any);
    appointmentsRepoMock.bumpAppointmentVersionTx.mockResolvedValue({ kind: "version_conflict" });

    await expect(removeEmployeeFromAppointment(52, 9, 2, "ADMIN")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });

    expect(appointmentsRepoMock.deleteAppointmentEmployeeTx).not.toHaveBeenCalled();
  });

  it("rejects invalid appointment versions", async () => {
    await expect(removeEmployeeFromAppointment(53, 9, 0, "ADMIN")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });
});
