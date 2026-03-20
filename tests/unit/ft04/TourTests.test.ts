/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Tour anlegen / Tour bearbeiten / Tour loeschen
 *
 * Abgedeckte Regeln:
 * - Tournamen werden serverseitig deterministisch als "Tour N" vergeben.
 * - Tour-Update/Delete verlangen gueltige Version >= 1.
 * - Tour-Delete ist gesperrt, wenn Termine auf die Tour verweisen (BUSINESS_CONFLICT).
 *
 * Fehlerfaelle:
 * - Ungueltige Version fuehrt zu VALIDATION_ERROR.
 * - Loeschen bei verknuepften Terminen liefert BUSINESS_CONFLICT.
 *
 * Ziel:
 * Unit-Absicherung der FT04-Kernlogik inkl. Namensvergabe, Versionspruefung und Loeschschutz bei Terminreferenzen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: vi.fn(),
  getTour: vi.fn(),
  hasAppointmentsForTour: vi.fn(),
  createTour: vi.fn(),
  updateTourWithVersion: vi.fn(),
  deleteTourWithVersion: vi.fn(),
}));

import * as toursRepository from "../../../server/repositories/toursRepository";
import { ToursError, createTour, deleteTour, updateTour } from "../../../server/services/toursService";

const toursRepositoryMock = vi.mocked(toursRepository);

describe("FT04 unit: toursService core behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates tours with deterministic generated names", async () => {
    toursRepositoryMock.getTours.mockResolvedValue([
      { id: 1, name: "Tour 1", color: "#111111", version: 1 } as any,
      { id: 2, name: "Tour 2", color: "#222222", version: 1 } as any,
    ]);
    toursRepositoryMock.createTour.mockResolvedValue({
      id: 3,
      name: "Tour 3",
      color: "#333333",
      version: 1,
    } as any);

    const created = await createTour({ color: "#333333" } as any);

    expect(toursRepositoryMock.createTour).toHaveBeenCalledWith("Tour 3", "#333333");
    expect(created.name).toBe("Tour 3");
  });

  it("fills naming gaps when lower numbers are missing", async () => {
    toursRepositoryMock.getTours.mockResolvedValue([
      { id: 10, name: "Tour 1", color: "#111111", version: 1 } as any,
      { id: 11, name: "Tour 3", color: "#222222", version: 1 } as any,
    ]);
    toursRepositoryMock.createTour.mockResolvedValue({
      id: 12,
      name: "Tour 2",
      color: "#abcdef",
      version: 1,
    } as any);

    const created = await createTour({ color: "#abcdef" } as any);

    expect(toursRepositoryMock.createTour).toHaveBeenCalledWith("Tour 2", "#abcdef");
    expect(created.name).toBe("Tour 2");
  });

  it("rejects update with invalid version", async () => {
    await expect(updateTour(1, { color: "#123456", version: 0 })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects delete with invalid version", async () => {
    await expect(deleteTour(1, 0)).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("returns null for missing tour in version conflict path", async () => {
    toursRepositoryMock.updateTourWithVersion.mockResolvedValue({ kind: "version_conflict" } as any);
    toursRepositoryMock.getTour.mockResolvedValue(null);

    const result = await updateTour(999, { color: "#999999", version: 1 });

    expect(result).toBeNull();
  });

  it("throws VERSION_CONFLICT when stale version hits existing tour", async () => {
    toursRepositoryMock.updateTourWithVersion.mockResolvedValue({ kind: "version_conflict" } as any);
    toursRepositoryMock.getTour.mockResolvedValue({ id: 5, name: "Tour 5", color: "#000000", version: 2 } as any);

    await expect(updateTour(5, { color: "#101010", version: 1 })).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps delete conflict to NOT_FOUND when entity no longer exists", async () => {
    toursRepositoryMock.hasAppointmentsForTour.mockResolvedValue(false);
    toursRepositoryMock.deleteTourWithVersion.mockResolvedValue({ kind: "version_conflict" } as any);
    toursRepositoryMock.getTour.mockResolvedValue(null);

    await expect(deleteTour(404, 1)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("returns BUSINESS_CONFLICT when appointments reference the tour", async () => {
    toursRepositoryMock.hasAppointmentsForTour.mockResolvedValue(true);

    await expect(deleteTour(7, 1)).rejects.toMatchObject({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(toursRepositoryMock.deleteTourWithVersion).not.toHaveBeenCalled();
  });

  it("throws typed ToursError for direct type checks", () => {
    const err = new ToursError(422, "VALIDATION_ERROR");
    expect(err).toBeInstanceOf(ToursError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});
