/**
 * Test Scope:
 *
 * Feature: FT11 - Team Verwaltung
 * Use Case: UC Team anlegen / bearbeiten / loeschen
 *
 * Abgedeckte Regeln:
 * - Teamname wird serverseitig generiert und bleibt eindeutig fortlaufend.
 * - Clientseitig uebergebene Namen werden im Service-Pfad nicht verwendet.
 * - Update/Delete validieren Versionswerte strikt.
 * - Version-Konflikte werden zu VERSION_CONFLICT oder NOT_FOUND aufgeloest.
 *
 * Fehlerfaelle:
 * - Version < 1 fuehrt zu VALIDATION_ERROR.
 * - Stale Version fuehrt je nach Existenz zu VERSION_CONFLICT bzw. NOT_FOUND.
 *
 * Ziel:
 * FT11-Servicevertrag fuer Team-Stammdaten als IST-Zustand regressionssicher absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTeamsMock,
  createTeamMock,
  updateTeamWithVersionMock,
  deleteTeamWithVersionMock,
  getTeamMock,
} = vi.hoisted(() => ({
  getTeamsMock: vi.fn(),
  createTeamMock: vi.fn(),
  updateTeamWithVersionMock: vi.fn(),
  deleteTeamWithVersionMock: vi.fn(),
  getTeamMock: vi.fn(),
}));

vi.mock("../../../server/repositories/teamsRepository", () => ({
  getTeams: getTeamsMock,
  createTeam: createTeamMock,
  updateTeamWithVersion: updateTeamWithVersionMock,
  deleteTeamWithVersion: deleteTeamWithVersionMock,
  getTeam: getTeamMock,
}));

import { TeamsError, createTeam, deleteTeam, updateTeam } from "../../../server/services/teamsService";

describe("FT11 unit: teamsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates team name on server and ignores client-provided name", async () => {
    getTeamsMock.mockResolvedValueOnce([]);
    createTeamMock.mockResolvedValueOnce({ id: 1, name: "Team 1", color: "#112233", version: 1 });

    const created = await createTeam({ color: "#112233", name: "Client Name" } as any);

    expect(created.name).toBe("Team 1");
    expect(createTeamMock).toHaveBeenCalledWith("Team 1", "#112233");
    expect(createTeamMock).not.toHaveBeenCalledWith("Client Name", "#112233");
  });

  it("keeps generated names unique when existing names already contain next slot", async () => {
    getTeamsMock.mockResolvedValueOnce([
      { id: 1, name: "Team 1", color: "#111111", version: 1 },
      { id: 2, name: "Team 2", color: "#222222", version: 1 },
      { id: 3, name: "Team 4", color: "#444444", version: 1 },
    ]);
    createTeamMock.mockResolvedValueOnce({ id: 4, name: "Team 5", color: "#555555", version: 1 });

    await createTeam({ color: "#555555" });

    expect(createTeamMock).toHaveBeenCalledWith("Team 5", "#555555");
  });

  it("rejects update when version is invalid", async () => {
    await expect(updateTeam(5, { color: "#abcdef", version: 0 })).rejects.toMatchObject<TeamsError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects delete when version is invalid", async () => {
    await expect(deleteTeam(5, 0)).rejects.toMatchObject<TeamsError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("maps update version conflict to null when team no longer exists", async () => {
    updateTeamWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getTeamMock.mockResolvedValueOnce(null);

    const result = await updateTeam(99, { color: "#999999", version: 3 });

    expect(result).toBeNull();
  });

  it("maps update version conflict to VERSION_CONFLICT when team still exists", async () => {
    updateTeamWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getTeamMock.mockResolvedValueOnce({ id: 9, name: "Team 9", color: "#999999", version: 7 });

    await expect(updateTeam(9, { color: "#aaaaaa", version: 3 })).rejects.toMatchObject<TeamsError>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps delete version conflict to NOT_FOUND when team is gone", async () => {
    deleteTeamWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getTeamMock.mockResolvedValueOnce(null);

    await expect(deleteTeam(101, 2)).rejects.toMatchObject<TeamsError>({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("maps delete version conflict to VERSION_CONFLICT when team still exists", async () => {
    deleteTeamWithVersionMock.mockResolvedValueOnce({ kind: "version_conflict" });
    getTeamMock.mockResolvedValueOnce({ id: 10, name: "Team 10", color: "#101010", version: 5 });

    await expect(deleteTeam(10, 2)).rejects.toMatchObject<TeamsError>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });
});

