/**
 * Test Scope:
 *
 * Feature: FT11 - Team Verwaltung
 * Use Case: UC Team-Mitarbeiter zuweisen / entfernen
 *
 * Abgedeckte Regeln:
 * - Assign erwartet fuer jedes Item eine gueltige Versionsnummer.
 * - Remove erwartet eine gueltige Versionsnummer.
 * - Stale/fehlende Mitarbeiter werden als VERSION_CONFLICT bzw. NOT_FOUND gemeldet.
 * - Batch-Assign laeuft transaktional und bricht bei Fehler ab.
 *
 * Fehlerfaelle:
 * - Version < 1 liefert VALIDATION_ERROR.
 * - Gemischte Batch-Payload mit Konflikt fuehrt zum Abbruch des gesamten Vorgangs.
 *
 * Ziel:
 * FT11-Servicevertrag fuer Team-Mitarbeiterbeziehungen als IST-Zustand absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  setEmployeeTeamWithVersionMock,
  setEmployeeTeamWithVersionTxMock,
  getEmployeeMock,
  getEmployeeTxMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  setEmployeeTeamWithVersionMock: vi.fn(),
  setEmployeeTeamWithVersionTxMock: vi.fn(),
  getEmployeeMock: vi.fn(),
  getEmployeeTxMock: vi.fn(),
}));

vi.mock("../../../server/db", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  setEmployeeTeamWithVersion: setEmployeeTeamWithVersionMock,
  setEmployeeTeamWithVersionTx: setEmployeeTeamWithVersionTxMock,
  getEmployee: getEmployeeMock,
  getEmployeeTx: getEmployeeTxMock,
  getEmployeesByTeam: vi.fn(),
}));

import {
  TeamEmployeesError,
  assignEmployeesToTeam,
  removeEmployeeFromTeam,
} from "../../../server/services/teamEmployeesService";

describe("FT11 unit: teamEmployeesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({}));
  });

  it("rejects assign when at least one item has invalid version", async () => {
    await expect(
      assignEmployeesToTeam(1, [{ employeeId: 100, version: 0 }]),
    ).rejects.toMatchObject<TeamEmployeesError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects remove when version is invalid", async () => {
    await expect(removeEmployeeFromTeam(100, 0)).rejects.toMatchObject<TeamEmployeesError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("returns NOT_FOUND on assign when employee does not exist", async () => {
    setEmployeeTeamWithVersionTxMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeTxMock.mockResolvedValueOnce(null);

    await expect(
      assignEmployeesToTeam(9, [{ employeeId: 404, version: 3 }]),
    ).rejects.toMatchObject<TeamEmployeesError>({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("returns VERSION_CONFLICT on assign when employee exists but version is stale", async () => {
    setEmployeeTeamWithVersionTxMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeTxMock.mockResolvedValueOnce({ id: 20, version: 5 });

    await expect(
      assignEmployeesToTeam(9, [{ employeeId: 20, version: 2 }]),
    ).rejects.toMatchObject<TeamEmployeesError>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("aborts transactional batch assign on conflict without returning partial success", async () => {
    setEmployeeTeamWithVersionTxMock
      .mockResolvedValueOnce({ kind: "updated", employee: { id: 1, version: 2, teamId: 7 } })
      .mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeTxMock.mockResolvedValueOnce({ id: 2, version: 3 });

    await expect(
      assignEmployeesToTeam(7, [
        { employeeId: 1, version: 1 },
        { employeeId: 2, version: 1 },
      ]),
    ).rejects.toMatchObject<TeamEmployeesError>({
      status: 409,
      code: "VERSION_CONFLICT",
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(setEmployeeTeamWithVersionTxMock).toHaveBeenCalledTimes(2);
  });

  it("returns null on remove conflict when employee is already missing", async () => {
    setEmployeeTeamWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getEmployeeMock.mockResolvedValueOnce(null);

    const result = await removeEmployeeFromTeam(555, 2);

    expect(result).toBeNull();
  });
});

