/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - parkAppointment entfernt alle Mitarbeiter, setzt Tour Parkplatz und Tag Geparkt atomar.
 * - parkAppointment erfordert den System-Seed (Parkplatz-Tour und Geparkt-Tag muessen existieren).
 * - parkAppointment schlaegt mit ALREADY_PARKED fehl wenn Termin bereits in Parkplatz-Tour ist.
 * - parkAppointment bumpt die Version atomar ueber setAppointmentParkTx.
 * - parkAppointment blockiert historische Termine.
 * - parkAppointment blockiert stornierte Termine.
 * - createAppointment setzt Tag Messe Aufbau/Abbau still wenn direkt auf Tour Messe angelegt wird.
 * - createAppointment liefert fuer Tour- und Tag-Folgen zentrale mutationEvents zurueck.
 * - updateAppointment entfernt Tag Geparkt still wenn Tour von Parkplatz auf andere wechselt.
 * - updateAppointment setzt Tag Messe Aufbau/Abbau still wenn auf Tour Messe gewechselt wird.
 * - updateAppointment entfernt Tag Messe Aufbau/Abbau still wenn von Tour Messe weg gewechselt wird.
 * - updateAppointment liefert fuer Parkplatz-/Messe-Tourwechsel zentrale mutationEvents zurueck.
 * - updateAppointment entfernt Tag Geparkt nicht wenn Tour nicht Parkplatz war.
 * - updateAppointment erlaubt historische Parkplatz-Termine weiterhin fuer Umplanung und Bearbeitung.
 *
 * Fehlerfaelle:
 * - Termin bereits geparkt bleibt unveraendert.
 * - Historischer Termin kann nicht geparkt werden.
 * - Stornierter Termin kann nicht geparkt werden.
 * - Versionskonflikt beim Parken liefert VERSION_CONFLICT.
 * - Fehlende Parkplatz-Tour liefert BUSINESS_CONFLICT.
 * - Fehlender Geparkt-Tag liefert BUSINESS_CONFLICT.
 *
 * Ziel:
 * Den Park-Pfad fuer Termine sowie den automatischen Geparkt-Tag-Entzug bei Tour-Wechsel isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  getAppointment: vi.fn(),
  getAppointmentTx: vi.fn(),
  withAppointmentTransaction: vi.fn(),
  createAppointmentTx: vi.fn(),
  setAppointmentParkTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  addAppointmentTagTx: vi.fn(),
  removeAppointmentTagByTagIdTx: vi.fn(),
  getAppointmentTagsByAppointmentIds: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
  getConflictingEmployeesTx: vi.fn(),
  getProjectTx: vi.fn(),
  getInactiveEmployeesByIdsTx: vi.fn(),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: vi.fn(),
  getTour: vi.fn(),
}));

vi.mock("../../../server/services/tagRelationsService", () => ({
  getTagByName: vi.fn(),
  getTagById: vi.fn(),
  listTagRelations: vi.fn(),
  addTagRelation: vi.fn(),
  removeTagRelation: vi.fn(),
}));

vi.mock("../../../server/services/caldavSyncDispatcher", () => ({
  dispatchCalDavUpsert: vi.fn(),
  dispatchCalDavDelete: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import * as tagRelationsService from "../../../server/services/tagRelationsService";
import { createAppointment, parkAppointment, updateAppointment } from "../../../server/services/appointmentsService";

const repoMock = vi.mocked(appointmentsRepository);
const toursMock = vi.mocked(toursRepository);
const tagServiceMock = vi.mocked(tagRelationsService);

const PARKPLATZ_TOUR = { id: 10, name: "Parkplatz", color: "#D4537E", version: 1 };
const MESSE_TOUR = { id: 11, name: "Tour Messe", color: "#3465A4", version: 1 };
const GEPARKT_TAG = { id: 77, name: "Geparkt", color: "#D4537E", isDefault: true, version: 1 };
const MESSE_TAG = { id: 88, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: true, version: 1 };
const FUTURE_DATE = "2099-12-31";

describe("FT06 unit: parkAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    repoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });

    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR]);
    tagServiceMock.getTagByName.mockImplementation(async (name: string) => {
      if (name === "Geparkt") return GEPARKT_TAG;
      if (name === "Messe Aufbau/Abbau") return MESSE_TAG;
      if (name === "Storniert") return null;
      return null;
    });
    repoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
    repoMock.setAppointmentParkTx.mockResolvedValue({ kind: "updated" });
    repoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    repoMock.addAppointmentTagTx.mockResolvedValue(undefined);
  });

  it("entfernt alle Mitarbeiter, setzt Parkplatz-Tour und Geparkt-Tag atomar", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 1, startDate: FUTURE_DATE, tourId: null } as any);
    repoMock.getAppointmentTx.mockResolvedValue({ id: 1, startDate: FUTURE_DATE, tourId: null } as any);

    const result = await parkAppointment(1, 3, "DISPONENT");

    expect(result).toEqual({ found: true });
    expect(repoMock.setAppointmentParkTx).toHaveBeenCalledWith(expect.anything(), {
      appointmentId: 1,
      expectedVersion: 3,
      tourId: PARKPLATZ_TOUR.id,
    });
    expect(repoMock.replaceAppointmentEmployeesTx).toHaveBeenCalledWith(expect.anything(), 1, []);
    expect(repoMock.addAppointmentTagTx).toHaveBeenCalledWith(expect.anything(), 1, GEPARKT_TAG.id);
  });

  it("gibt ALREADY_PARKED zurueck wenn Termin bereits in Parkplatz-Tour ist", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 2, startDate: FUTURE_DATE, tourId: PARKPLATZ_TOUR.id } as any);
    repoMock.getAppointmentTx.mockResolvedValue({ id: 2, startDate: FUTURE_DATE, tourId: PARKPLATZ_TOUR.id } as any);

    await expect(parkAppointment(2, 1, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_PARKED",
    });

    expect(repoMock.setAppointmentParkTx).not.toHaveBeenCalled();
  });

  it("gibt VERSION_CONFLICT zurueck bei veralteter Version", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 3, startDate: FUTURE_DATE, tourId: null } as any);
    repoMock.getAppointmentTx.mockResolvedValue({ id: 3, startDate: FUTURE_DATE, tourId: null } as any);
    repoMock.setAppointmentParkTx.mockResolvedValue({ kind: "version_conflict" });

    await expect(parkAppointment(3, 99, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("blockiert historische Termine mit PAST_APPOINTMENT_READONLY", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 4, startDate: "2000-01-01", tourId: null } as any);

    await expect(parkAppointment(4, 1, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "PAST_APPOINTMENT_READONLY",
    });
  });

  it("blockiert stornierte Termine mit CANCELLED_APPOINTMENT_READONLY", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 5, startDate: FUTURE_DATE, tourId: null } as any);
    repoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(
      new Map([[5, [{ name: "Storniert" }]]]),
    );
    tagServiceMock.getTagByName.mockImplementation(async (name: string) => {
      if (name === "Storniert") return { id: 1, name: "Storniert", color: "#000", isDefault: true, version: 1 };
      return null;
    });

    await expect(parkAppointment(5, 1, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "CANCELLED_APPOINTMENT_READONLY",
    });
  });

  it("gibt BUSINESS_CONFLICT zurueck wenn Parkplatz-Tour fehlt", async () => {
    toursMock.getTours.mockResolvedValue([]);
    repoMock.getAppointment.mockResolvedValue({ id: 6, startDate: FUTURE_DATE, tourId: null } as any);

    await expect(parkAppointment(6, 1, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("gibt BUSINESS_CONFLICT zurueck wenn Geparkt-Tag fehlt", async () => {
    repoMock.getAppointment.mockResolvedValue({ id: 7, startDate: FUTURE_DATE, tourId: null } as any);
    tagServiceMock.getTagByName.mockResolvedValue(null);

    await expect(parkAppointment(7, 1, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("verweigert Parken fuer LESER mit FORBIDDEN", async () => {
    await expect(parkAppointment(8, 1, "LESER")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("gibt { found: false } zurueck wenn Termin nicht existiert", async () => {
    repoMock.getAppointment.mockResolvedValue(null);

    const result = await parkAppointment(999, 1, "ADMIN");

    expect(result).toEqual({ found: false });
  });

  it("verweigert Parken mit ungültiger Version", async () => {
    await expect(parkAppointment(10, 0, "ADMIN")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });
});

describe("FT06 unit: createAppointment Tour-Sonderregeln", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    repoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });

    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR]);
    tagServiceMock.getTagByName.mockImplementation(async (name: string) => {
      if (name === "Messe Aufbau/Abbau") return MESSE_TAG;
      if (name === "Storniert") return null;
      return null;
    });
    repoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    repoMock.getInactiveEmployeesByIdsTx.mockResolvedValue([]);
    repoMock.createAppointmentTx.mockResolvedValue(123 as never);
    repoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    repoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 123, employees: [] } as any);
    repoMock.getProjectTx.mockResolvedValue(null);
  });

  it("setzt Messe-Tag still wenn ein Termin direkt auf Tour Messe angelegt wird", async () => {
    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    const result = await createAppointment({
      customerId: 1,
      tourId: MESSE_TOUR.id,
      startDate: FUTURE_DATE,
      employeeIds: [],
    });

    expect(repoMock.addAppointmentTagTx).toHaveBeenCalledWith(
      expect.anything(),
      123,
      MESSE_TAG.id,
    );
    expect(result).toMatchObject({
      id: 123,
      mutationEvents: [
        {
          kind: "tour_changed",
          appointmentId: 123,
          previousTourId: null,
          nextTourId: MESSE_TOUR.id,
          previousTourName: null,
          nextTourName: MESSE_TOUR.name,
        },
        {
          kind: "tag_mutated",
          appointmentId: 123,
          tagName: "Messe Aufbau/Abbau",
          action: "added",
        },
      ],
    });
  });
});

describe("FT06 unit: updateAppointment Tour-Sonderregeln", () => {
  const BASE_APPOINTMENT = {
    id: 20,
    startDate: FUTURE_DATE,
    endDate: FUTURE_DATE,
    startTime: null,
    tourId: PARKPLATZ_TOUR.id,
    projectId: null,
    customerId: 1,
    version: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    repoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });

    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR]);
    tagServiceMock.getTagByName.mockImplementation(async (name: string) => {
      if (name === "Geparkt") return GEPARKT_TAG;
      if (name === "Messe Aufbau/Abbau") return MESSE_TAG;
      if (name === "Storniert") return null;
      return null;
    });
    repoMock.getAppointmentTagsByAppointmentIds.mockResolvedValue(new Map());
    repoMock.getConflictingEmployeesTx.mockResolvedValue([]);
    repoMock.getInactiveEmployeesByIdsTx.mockResolvedValue([]);
    repoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    repoMock.removeAppointmentTagByTagIdTx.mockResolvedValue(undefined);
    repoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    repoMock.getAppointmentWithEmployeesTx.mockResolvedValue({ id: 20, employees: [] } as any);
  });

  function mockCustomerAndProject() {
    repoMock.getProjectTx.mockResolvedValue(null);
  }

  it("entfernt Geparkt-Tag still wenn Tour von Parkplatz auf andere Tour wechselt", async () => {
    const OTHER_TOUR = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR, OTHER_TOUR]);

    repoMock.getAppointmentTx.mockResolvedValue({ ...BASE_APPOINTMENT, tourId: PARKPLATZ_TOUR.id } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    const result = await updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: OTHER_TOUR.id,
        customerId: 1,
      },
      "ADMIN",
    );

    expect(repoMock.removeAppointmentTagByTagIdTx).toHaveBeenCalledWith(
      expect.anything(),
      20,
      GEPARKT_TAG.id,
    );
    expect(result).toMatchObject({
      id: 20,
      mutationEvents: [
        {
          kind: "tour_changed",
          appointmentId: 20,
          previousTourId: PARKPLATZ_TOUR.id,
          nextTourId: OTHER_TOUR.id,
          previousTourName: PARKPLATZ_TOUR.name,
          nextTourName: OTHER_TOUR.name,
        },
        {
          kind: "tag_mutated",
          appointmentId: 20,
          tagName: "Geparkt",
          action: "removed",
        },
      ],
    });
  });

  it("erlaubt historische Parkplatz-Termine fuer Update, Zukunftsumplanung und Rueckdatierung", async () => {
    const OTHER_TOUR = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR, OTHER_TOUR]);

    repoMock.getAppointmentTx.mockResolvedValue({
      ...BASE_APPOINTMENT,
      startDate: "2000-01-01",
      endDate: "2000-01-01",
      tourId: PARKPLATZ_TOUR.id,
    } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    await expect(updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: OTHER_TOUR.id,
        customerId: 1,
      },
      "ADMIN",
    )).resolves.toBeTruthy();

    expect(repoMock.updateAppointmentWithVersionTx).toHaveBeenCalled();

    await expect(updateAppointment(
      20,
      {
        version: 2,
        startDate: "2000-01-02",
        customerId: 1,
      },
      "ADMIN",
    )).resolves.toBeTruthy();
  });

  it("entfernt Geparkt-Tag nicht wenn Tour nicht Parkplatz war", async () => {
    const TOUR_A = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    const TOUR_B = { id: 6, name: "Tour 2", color: "#00ACB1", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR, TOUR_A, TOUR_B]);

    repoMock.getAppointmentTx.mockResolvedValue({ ...BASE_APPOINTMENT, tourId: TOUR_A.id } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    const result = await updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: TOUR_B.id,
        customerId: 1,
      },
      "ADMIN",
    );

    expect(repoMock.removeAppointmentTagByTagIdTx).not.toHaveBeenCalled();
  });

  it("setzt Messe-Tag still wenn auf Tour Messe gewechselt wird", async () => {
    const REGULAR_TOUR = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, REGULAR_TOUR, MESSE_TOUR]);
    repoMock.getAppointmentTx.mockResolvedValue({ ...BASE_APPOINTMENT, tourId: REGULAR_TOUR.id } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    const result = await updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: MESSE_TOUR.id,
        customerId: 1,
      },
      "ADMIN",
    );

    expect(repoMock.addAppointmentTagTx).toHaveBeenCalledWith(
      expect.anything(),
      20,
      MESSE_TAG.id,
    );
    expect(result).toMatchObject({
      id: 20,
      mutationEvents: [
        {
          kind: "tour_changed",
          appointmentId: 20,
          previousTourId: REGULAR_TOUR.id,
          nextTourId: MESSE_TOUR.id,
          previousTourName: REGULAR_TOUR.name,
          nextTourName: MESSE_TOUR.name,
        },
        {
          kind: "tag_mutated",
          appointmentId: 20,
          tagName: "Messe Aufbau/Abbau",
          action: "added",
        },
      ],
    });
  });

  it("entfernt Messe-Tag still wenn von Tour Messe auf andere Tour gewechselt wird", async () => {
    const REGULAR_TOUR = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR, REGULAR_TOUR]);
    repoMock.getAppointmentTx.mockResolvedValue({ ...BASE_APPOINTMENT, tourId: MESSE_TOUR.id } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    const result = await updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: REGULAR_TOUR.id,
        customerId: 1,
      },
      "ADMIN",
    );

    expect(repoMock.removeAppointmentTagByTagIdTx).toHaveBeenCalledWith(
      expect.anything(),
      20,
      MESSE_TAG.id,
    );
    expect(result).toMatchObject({
      id: 20,
      mutationEvents: [
        {
          kind: "tour_changed",
          appointmentId: 20,
          previousTourId: MESSE_TOUR.id,
          nextTourId: REGULAR_TOUR.id,
          previousTourName: MESSE_TOUR.name,
          nextTourName: REGULAR_TOUR.name,
        },
        {
          kind: "tag_mutated",
          appointmentId: 20,
          tagName: "Messe Aufbau/Abbau",
          action: "removed",
        },
      ],
    });
  });

  it("veraendert Messe-Tag nicht wenn kein Messe-Tourwechsel stattfindet", async () => {
    const TOUR_A = { id: 5, name: "Tour 1", color: "#006B6F", version: 1 };
    const TOUR_B = { id: 6, name: "Tour 2", color: "#00ACB1", version: 1 };
    toursMock.getTours.mockResolvedValue([PARKPLATZ_TOUR, MESSE_TOUR, TOUR_A, TOUR_B]);
    repoMock.getAppointmentTx.mockResolvedValue({ ...BASE_APPOINTMENT, tourId: TOUR_A.id } as any);

    await import("../../../server/repositories/customersRepository").then((m) => {
      vi.spyOn(m, "getCustomer").mockResolvedValue({
        id: 1,
        customerNumber: "K001",
        fullName: "Test Kunde",
        isActive: true,
      } as any);
    });

    await updateAppointment(
      20,
      {
        version: 2,
        startDate: FUTURE_DATE,
        tourId: TOUR_B.id,
        customerId: 1,
      },
      "ADMIN",
    );

    expect(repoMock.addAppointmentTagTx).not.toHaveBeenCalled();
    expect(repoMock.removeAppointmentTagByTagIdTx).not.toHaveBeenCalledWith(
      expect.anything(),
      20,
      MESSE_TAG.id,
    );
  });
});
