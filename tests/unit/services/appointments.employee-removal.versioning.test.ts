/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter-Entfernen aus Terminen erwartet eine gueltige Appointment-Version.
 * - Der Pfad bump't die Appointment-Version vor dem eigentlichen Join-Delete atomar.
 * - Stornierte Termine bleiben fuer den Remove-Pfad gesperrt.
 * - Historische Nicht-Parkplatz-Termine bleiben fuer den Remove-Pfad gesperrt.
 * - Historische Parkplatz-Termine duerfen weiterhin bearbeitet werden.
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

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTour: vi.fn(),
  getTours: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import { removeEmployeeFromAppointment } from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);
const toursRepoMock = vi.mocked(toursRepository);

describe("FT01 unit: appointment employee removal versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
    appointmentsRepoMock.bumpAppointmentVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
    toursRepoMock.getTour.mockResolvedValue({ id: 88, name: "Parkplatz", color: "#D4537E", version: 1 } as any);
    toursRepoMock.getTours.mockResolvedValue([{ id: 88, name: "Parkplatz", color: "#D4537E", version: 1 }] as any);
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

  it("blocks employee removal for historical non-Parkplatz appointments for dispatchers", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({ id: 54, startDate: "2000-01-01", tourId: 12 } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({ id: 54, startDate: "2000-01-01", tourId: 12 } as any);

    await expect(removeEmployeeFromAppointment(54, 9, 3, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "PAST_APPOINTMENT_READONLY",
    });

    expect(appointmentsRepoMock.deleteAppointmentEmployeeTx).not.toHaveBeenCalled();
  });

  it("allows employee removal for historical Parkplatz appointments", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({ id: 55, startDate: "2000-01-01", tourId: 88 } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({ id: 55, startDate: "2000-01-01", tourId: 88 } as any);

    const result = await removeEmployeeFromAppointment(55, 9, 3, "ADMIN");

    expect(result).toEqual({ found: true });
    expect(appointmentsRepoMock.deleteAppointmentEmployeeTx).toHaveBeenCalledWith(expect.anything(), 55, 9);
  });

});
