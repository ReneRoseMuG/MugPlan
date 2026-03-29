/**
 * Test Scope:
 *
 * Feature: FT05/FT05+ - Mitarbeiterverwaltung Servicevertrag
 * Use Case: UC Mitarbeiter anlegen / bearbeiten / aktivieren-deaktivieren / Sichtbarkeit nach Rolle
 *
 * Abgedeckte Regeln:
 * - createEmployee bildet fullName aus lastName, firstName und delegiert an Repository.
 * - updateEmployee erzwingt gueltige Versionen und mappt stale Version auf VERSION_CONFLICT.
 * - toggleEmployeeActive ist Admin-only und erzwingt gueltige Versionen.
 * - Nicht-Admin sieht inaktive Mitarbeiter weder im Detail noch per inactive-Scope.
 *
 * Fehlerfaelle:
 * - Version < 1 liefert VALIDATION_ERROR.
 * - Nicht-Admin isActive-Aenderung liefert FORBIDDEN.
 * - Stale Version liefert VERSION_CONFLICT.
 *
 * Ziel:
 * Den IST-Servicevertrag von FT05/FT05+ ohne Produktivcode-Aenderung absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEmployeeListItemsMock,
  getEmployeeMock,
  createEmployeeRepoMock,
  updateEmployeeWithVersionMock,
  toggleEmployeeActiveWithVersionMock,
  getEmployeeTagsByEmployeeIdsMock,
  getTeamMock,
  getTourMock,
} = vi.hoisted(() => ({
  getEmployeeListItemsMock: vi.fn(),
  getEmployeeMock: vi.fn(),
  createEmployeeRepoMock: vi.fn(),
  updateEmployeeWithVersionMock: vi.fn(),
  toggleEmployeeActiveWithVersionMock: vi.fn(),
  getEmployeeTagsByEmployeeIdsMock: vi.fn(),
  getTeamMock: vi.fn(),
  getTourMock: vi.fn(),
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getEmployeeListItems: getEmployeeListItemsMock,
  getEmployee: getEmployeeMock,
  createEmployee: createEmployeeRepoMock,
  updateEmployeeWithVersion: updateEmployeeWithVersionMock,
  toggleEmployeeActiveWithVersion: toggleEmployeeActiveWithVersionMock,
}));

vi.mock("../../../server/repositories/tagRelationsRepository", () => ({
  getEmployeeTagsByEmployeeIds: getEmployeeTagsByEmployeeIdsMock,
}));

vi.mock("../../../server/repositories/teamsRepository", () => ({
  getTeam: getTeamMock,
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTour: getTourMock,
}));

import {
  EmployeesError,
  createEmployee,
  getEmployeeWithRelations,
  listEmployees,
  toggleEmployeeActive,
  updateEmployee,
} from "../../../server/services/employeesService";

describe("FT05 unit: employeesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmployeeTagsByEmployeeIdsMock.mockResolvedValue(new Map());
  });

  it("createEmployee builds fullName and returns repository employee", async () => {
    createEmployeeRepoMock.mockResolvedValueOnce({
      id: 1,
      firstName: "Max",
      lastName: "Muster",
      fullName: "Muster, Max",
      phone: null,
      email: null,
      isActive: true,
      teamId: null,
      tourId: null,
      version: 1,
    });

    const created = await createEmployee({
      firstName: "Max",
      lastName: "Muster",
      phone: null,
      email: null,
    });

    expect(createEmployeeRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Max",
        lastName: "Muster",
        fullName: "Muster, Max",
      }),
    );
    expect(created.version).toBe(1);
    expect(created.isActive).toBe(true);
  });

  it("listEmployees enforces active scope for non-admin and respects requested scope for admin", async () => {
    getEmployeeListItemsMock.mockResolvedValue([]);

    await listEmployees("DISPONENT", "inactive");
    expect(getEmployeeListItemsMock).toHaveBeenLastCalledWith("active");

    await listEmployees("ADMIN", "inactive");
    expect(getEmployeeListItemsMock).toHaveBeenLastCalledWith("inactive");
  });

  it("getEmployeeWithRelations returns null for non-admin when employee is inactive", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 5,
      firstName: "Ina",
      lastName: "Aktiv",
      fullName: "Aktiv, Ina",
      phone: null,
      email: null,
      isActive: false,
      teamId: null,
      tourId: null,
      version: 2,
    });

    const result = await getEmployeeWithRelations(5, "DISPONENT");

    expect(result).toBeNull();
  });

  it("getEmployeeWithRelations returns employee with team/tour for admin", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 9,
      firstName: "Tom",
      lastName: "Team",
      fullName: "Team, Tom",
      phone: null,
      email: null,
      isActive: false,
      teamId: 11,
      tourId: 12,
      version: 3,
    });
    getTeamMock.mockResolvedValueOnce({ id: 11, name: "T-1", color: "#111", version: 1 });
    getTourMock.mockResolvedValueOnce({ id: 12, name: "R-1", color: "#222", version: 1 });

    const result = await getEmployeeWithRelations(9, "ADMIN");

    expect(result?.employee.id).toBe(9);
    expect(result?.team?.id).toBe(11);
    expect(result?.tour?.id).toBe(12);
  });

  it("updateEmployee rejects version < 1", async () => {
    await expect(
      updateEmployee(1, { firstName: "A", version: 0 }, "ADMIN"),
    ).rejects.toMatchObject<EmployeesError>({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("updateEmployee returns null when employee does not exist", async () => {
    getEmployeeMock.mockResolvedValueOnce(null);

    const result = await updateEmployee(404, { firstName: "A", version: 1 }, "ADMIN");

    expect(result).toBeNull();
  });

  it("updateEmployee forbids non-admin isActive change", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 2,
      firstName: "Paul",
      lastName: "User",
      fullName: "User, Paul",
      phone: null,
      email: null,
      isActive: true,
      teamId: null,
      tourId: null,
      version: 1,
    });

    await expect(
      updateEmployee(2, { isActive: false, version: 1 }, "DISPONENT"),
    ).rejects.toMatchObject<EmployeesError>({ status: 403, code: "FORBIDDEN" });
  });

  it("updateEmployee maps stale version to VERSION_CONFLICT", async () => {
    getEmployeeMock
      .mockResolvedValueOnce({
        id: 3,
        firstName: "A",
        lastName: "B",
        fullName: "B, A",
        phone: null,
        email: null,
        isActive: true,
        teamId: null,
        tourId: null,
        version: 4,
      })
      .mockResolvedValueOnce({
        id: 3,
        firstName: "A",
        lastName: "B",
        fullName: "B, A",
        phone: null,
        email: null,
        isActive: true,
        teamId: null,
        tourId: null,
        version: 5,
      });
    updateEmployeeWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });

    await expect(
      updateEmployee(3, { firstName: "Neu", version: 4 }, "ADMIN"),
    ).rejects.toMatchObject<EmployeesError>({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("updateEmployee with identical values documents delegated version behavior", async () => {
    getEmployeeMock.mockResolvedValueOnce({
      id: 10,
      firstName: "Eva",
      lastName: "Gleich",
      fullName: "Gleich, Eva",
      phone: null,
      email: null,
      isActive: true,
      teamId: null,
      tourId: null,
      version: 2,
    });
    updateEmployeeWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      employee: {
        id: 10,
        firstName: "Eva",
        lastName: "Gleich",
        fullName: "Gleich, Eva",
        phone: null,
        email: null,
        isActive: true,
        teamId: null,
        tourId: null,
        version: 3,
      },
    });

    const updated = await updateEmployee(
      10,
      { firstName: "Eva", lastName: "Gleich", version: 2 },
      "ADMIN",
    );

    expect(updateEmployeeWithVersionMock).toHaveBeenCalledWith(
      10,
      2,
      expect.objectContaining({ fullName: "Gleich, Eva" }),
    );
    expect(updated?.version).toBe(3);
  });

  it("toggleEmployeeActive rejects non-admin", async () => {
    await expect(toggleEmployeeActive(1, false, 1, "DISPONENT")).rejects.toMatchObject<EmployeesError>({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("toggleEmployeeActive rejects invalid version", async () => {
    await expect(toggleEmployeeActive(1, false, 0, "ADMIN")).rejects.toMatchObject<EmployeesError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("toggleEmployeeActive maps stale version to VERSION_CONFLICT", async () => {
    toggleEmployeeActiveWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeMock.mockResolvedValueOnce({
      id: 1,
      firstName: "A",
      lastName: "B",
      fullName: "B, A",
      phone: null,
      email: null,
      isActive: true,
      teamId: null,
      tourId: null,
      version: 2,
    });

    await expect(toggleEmployeeActive(1, false, 1, "ADMIN")).rejects.toMatchObject<EmployeesError>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("toggleEmployeeActive returns null when conflict path finds no employee", async () => {
    toggleEmployeeActiveWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeMock.mockResolvedValueOnce(null);

    const result = await toggleEmployeeActive(999, false, 1, "ADMIN");

    expect(result).toBeNull();
  });

  it("toggleEmployeeActive updates and increments version for admin", async () => {
    toggleEmployeeActiveWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      employee: {
        id: 7,
        firstName: "On",
        lastName: "Off",
        fullName: "Off, On",
        phone: null,
        email: null,
        isActive: false,
        teamId: null,
        tourId: null,
        version: 4,
      },
    });

    const result = await toggleEmployeeActive(7, false, 3, "ADMIN");

    expect(toggleEmployeeActiveWithVersionMock).toHaveBeenCalledWith(7, 3, false);
    expect(result?.version).toBe(4);
    expect(result?.isActive).toBe(false);
  });
});
