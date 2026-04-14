/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin-Storno entfernt serverseitig alle Mitarbeiterzuweisungen.
 * - Termin-Storno setzt den Projektbetrag bei projektgebundenen Terminen auf 0.00.
 * - Termin-Storno setzt den reservierten Storno-Tag innerhalb derselben Mutationskette.
 * - Termin-Storno erwartet eine gueltige Appointment-Version und bump't sie atomar.
 * - Bereits stornierte Termine werden mit frischer Version in den Endzustand ueberfuehrt.
 * - Historische Termine bleiben auch im Storno-Pfad gesperrt.
 *
 * Fehlerfaelle:
 * - Stornierte Termine behalten zugewiesene Mitarbeiter.
 * - Projektgebundene Stornos lassen den bisherigen Projektbetrag stehen.
 * - Ein Storno mit veralteter Version liefert keinen VERSION_CONFLICT.
 * - Historische Termine koennen trotz Sperre storniert werden.
 *
 * Ziel:
 * Die serverseitige Endzustandslogik des Einweg-Stornos isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  getAppointment: vi.fn(),
  getAppointmentTagsByAppointmentIds: vi.fn(),
  getAppointmentTx: vi.fn(),
  withAppointmentTransaction: vi.fn(),
  bumpAppointmentVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  addAppointmentTagTx: vi.fn(),
}));

vi.mock("../../../server/repositories/projectsRepository", () => ({
  setProjectOrderAmountTx: vi.fn(),
}));

vi.mock("../../../server/services/tagRelationsService", () => ({
  getTagByName: vi.fn(),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as projectsRepository from "../../../server/repositories/projectsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import * as tagRelationsService from "../../../server/services/tagRelationsService";
import { cancelAppointment, isAppointmentError } from "../../../server/services/appointmentsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);
const projectsRepoMock = vi.mocked(projectsRepository);
const toursRepoMock = vi.mocked(toursRepository);
const tagRelationsServiceMock = vi.mocked(tagRelationsService);

describe("FT01/FT28 unit: appointment cancellation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
    appointmentsRepoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
    appointmentsRepoMock.bumpAppointmentVersionTx.mockResolvedValue({ kind: "updated" });
    toursRepoMock.getTours.mockResolvedValue([{ id: 88, name: "Parkplatz", color: "#D4537E", version: 1 }] as any);

    tagRelationsServiceMock.getTagByName.mockResolvedValue({
      id: 77,
      name: "Storniert",
      color: "#3B2025",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it("clears employees and adds the reserved cancellation tag for active appointments", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 401,
      projectId: 901,
      startDate: new Date("2099-03-21T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 401,
      projectId: 901,
      startDate: new Date("2099-03-21T00:00:00.000Z"),
    } as any);

    const result = await cancelAppointment(401, 4, "DISPONENT");

    expect(result).toEqual({ found: true });
    expect(appointmentsRepoMock.bumpAppointmentVersionTx).toHaveBeenCalledWith(expect.anything(), {
      appointmentId: 401,
      expectedVersion: 4,
    });
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).toHaveBeenCalledWith(expect.anything(), 401, []);
    expect(projectsRepoMock.setProjectOrderAmountTx).toHaveBeenCalledWith(expect.anything(), 901, "0.00");
    expect(appointmentsRepoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 401, 77);
  });

  it("repairs already-cancelled direct appointments without touching project amounts", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 402,
      projectId: null,
      startDate: new Date("2099-03-22T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 402,
      projectId: null,
      startDate: new Date("2099-03-22T00:00:00.000Z"),
    } as any);

    await cancelAppointment(402, 6, "ADMIN");

    expect(appointmentsRepoMock.bumpAppointmentVersionTx).toHaveBeenCalledWith(expect.anything(), {
      appointmentId: 402,
      expectedVersion: 6,
    });
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).toHaveBeenCalledWith(expect.anything(), 402, []);
    expect(projectsRepoMock.setProjectOrderAmountTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 402, 77);
  });

  it("rejects cancellation when the appointment version is stale", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 404,
      startDate: new Date("2099-03-23T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 404,
      startDate: new Date("2099-03-23T00:00:00.000Z"),
    } as any);
    appointmentsRepoMock.bumpAppointmentVersionTx.mockResolvedValue({ kind: "version_conflict" });

    await expect(cancelAppointment(404, 2, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });

    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).not.toHaveBeenCalled();
    expect(projectsRepoMock.setProjectOrderAmountTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.addAppointmentTagTx).not.toHaveBeenCalled();
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
      await cancelAppointment(403, 3, "DISPONENT");
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({ status: 409, code: "PAST_APPOINTMENT_READONLY" });
    expect(appointmentsRepoMock.bumpAppointmentVersionTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.replaceAppointmentEmployeesTx).not.toHaveBeenCalled();
    expect(projectsRepoMock.setProjectOrderAmountTx).not.toHaveBeenCalled();
    expect(appointmentsRepoMock.addAppointmentTagTx).not.toHaveBeenCalled();
  });

  it("allows cancellation for historical appointments on Parkplatz", async () => {
    appointmentsRepoMock.getAppointment.mockResolvedValue({
      id: 405,
      projectId: null,
      startDate: new Date("2000-01-01T00:00:00.000Z"),
      tourId: 88,
    } as any);
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 405,
      projectId: null,
      startDate: new Date("2000-01-01T00:00:00.000Z"),
      tourId: 88,
    } as any);

    const result = await cancelAppointment(405, 7, "ADMIN");

    expect(result).toEqual({ found: true });
    expect(appointmentsRepoMock.bumpAppointmentVersionTx).toHaveBeenCalledWith(expect.anything(), {
      appointmentId: 405,
      expectedVersion: 7,
    });
    expect(appointmentsRepoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 405, 77);
  });
});
