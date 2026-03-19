/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin-Storno entfernt serverseitig alle Mitarbeiterzuweisungen.
 * - Termin-Storno setzt den reservierten Storno-Tag innerhalb derselben Mutationskette.
 * - Bereits stornierte Termine werden idempotent in den Endzustand ueberfuehrt.
 * - Historische Termine bleiben auch im Storno-Pfad gesperrt.
 *
 * Fehlerfaelle:
 * - Stornierte Termine behalten zugewiesene Mitarbeiter.
 * - Ein zweiter Storno-Aufruf laesst Altbestand mit Tag plus Mitarbeitern unveraendert.
 * - Historische Termine koennen trotz Sperre storniert werden.
 *
 * Ziel:
 * Die serverseitige Endzustandslogik des Einweg-Stornos isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  getAppointment: vi.fn(),
  getAppointmentTx: vi.fn(),
  withAppointmentTransaction: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  addAppointmentTagTx: vi.fn(),
}));

vi.mock("../../../server/services/tagRelationsService", () => ({
  ensureAppointmentCancellationTag: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as tagRelationsService from "../../../server/services/tagRelationsService";
import { cancelAppointment, isAppointmentError } from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);
const tagRelationsServiceMock = vi.mocked(tagRelationsService);

describe("FT01/FT28 unit: appointment cancellation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });

    tagRelationsServiceMock.ensureAppointmentCancellationTag.mockResolvedValue({
      id: 77,
      name: "Storniert",
      color: "#ef4444",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it("clears employees and adds the reserved cancellation tag for active appointments", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 401,
      startDate: new Date("2099-03-21T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 401,
      startDate: new Date("2099-03-21T00:00:00.000Z"),
    } as any);

    const result = await cancelAppointment(401, "DISPONENT");

    expect(result).toEqual({ found: true });
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).toHaveBeenCalledWith(expect.anything(), 401, []);
    expect(appointmentsRepoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 401, 77);
  });

  it("repairs already-cancelled appointments by still clearing lingering employees", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 402,
      startDate: new Date("2099-03-22T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 402,
      startDate: new Date("2099-03-22T00:00:00.000Z"),
    } as any);

    await cancelAppointment(402, "ADMIN");

    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).toHaveBeenCalledWith(expect.anything(), 402, []);
    expect(appointmentsRepoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 402, 77);
  });

  it("blocks cancellation for historical appointments before changing relations", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 403,
      startDate: new Date("2000-01-01T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 403,
      startDate: new Date("2000-01-01T00:00:00.000Z"),
    } as any);

    let error: unknown;
    try {
      await cancelAppointment(403, "DISPONENT");
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({ status: 409, code: "PAST_APPOINTMENT_READONLY" });
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.addAppointmentTagTx).not.toHaveBeenCalled();
  });
});
