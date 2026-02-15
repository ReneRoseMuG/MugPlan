/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus zu Projekt zuordnen / UC Projektstatus entfernen
 *
 * Abgedeckte Regeln:
 * - Inaktive Projektstatus duerfen nicht neu zugeordnet werden.
 * - Aktive Projektstatus duerfen zugeordnet werden.
 * - Add/Remove von Zuordnungen pruefen relation-basierte Versions-Preconditions.
 *
 * Fehlerfaelle:
 * - Zuordnung inaktiver Status liefert BUSINESS_CONFLICT.
 * - Add bei bestehender Relation liefert VERSION_CONFLICT.
 * - Remove mit stale Version liefert VERSION_CONFLICT.
 * - Entfernen nicht vorhandener Zuordnung liefert NOT_FOUND.
 *
 * Ziel:
 * Absicherung der FT15-Invarianten fuer die Status-Zuordnungslogik im Service.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/projectStatusRepository", () => ({
  getProjectStatus: vi.fn(),
  addProjectStatusWithExpectedVersion: vi.fn(),
  removeProjectStatusWithVersion: vi.fn(),
}));

import * as projectStatusRepository from "../../../server/repositories/projectStatusRepository";
import * as projectStatusService from "../../../server/services/projectStatusService";

const repoMock = vi.mocked(projectStatusRepository);

describe("PKG-15 Invariant: project status assignment rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks assigning inactive status with BUSINESS_CONFLICT", async () => {
    repoMock.getProjectStatus.mockResolvedValue({
      id: 9,
      title: "Archiv",
      description: null,
      color: "#64748b",
      sortOrder: 3,
      isActive: false,
      isDefault: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(projectStatusService.addProjectStatus(1, 9, 0, "ADMIN")).rejects.toMatchObject({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repoMock.addProjectStatusWithExpectedVersion).not.toHaveBeenCalled();
  });

  it("assigns active status with expectedVersion=0", async () => {
    repoMock.getProjectStatus.mockResolvedValue({
      id: 10,
      title: "In Arbeit",
      description: null,
      color: "#0ea5e9",
      sortOrder: 1,
      isActive: true,
      isDefault: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    repoMock.addProjectStatusWithExpectedVersion.mockResolvedValue({ kind: "created", relationVersion: 1 });
    const result = await projectStatusService.addProjectStatus(2, 10, 0, "DISPONENT");

    expect(repoMock.addProjectStatusWithExpectedVersion).toHaveBeenCalledWith(2, 10, 0);
    expect(result).toMatchObject({ relationVersion: 1, status: { id: 10 } });
  });

  it("blocks add when relation already exists with VERSION_CONFLICT", async () => {
    repoMock.getProjectStatus.mockResolvedValue({
      id: 10,
      title: "In Arbeit",
      description: null,
      color: "#0ea5e9",
      sortOrder: 1,
      isActive: true,
      isDefault: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    repoMock.addProjectStatusWithExpectedVersion.mockResolvedValue({ kind: "version_conflict", currentVersion: 1 });

    await expect(projectStatusService.addProjectStatus(2, 10, 0, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("removes relation with matching version", async () => {
    repoMock.removeProjectStatusWithVersion.mockResolvedValue({ kind: "deleted" });

    await expect(projectStatusService.removeProjectStatus(2, 10, 1, "DISPONENT")).resolves.toBeUndefined();
    expect(repoMock.removeProjectStatusWithVersion).toHaveBeenCalledWith(2, 10, 1);
  });

  it("returns VERSION_CONFLICT for stale remove version", async () => {
    repoMock.removeProjectStatusWithVersion.mockResolvedValue({ kind: "version_conflict" });

    await expect(projectStatusService.removeProjectStatus(2, 10, 99, "DISPONENT")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("returns NOT_FOUND when relation is missing", async () => {
    repoMock.removeProjectStatusWithVersion.mockResolvedValue({ kind: "not_found" });

    await expect(projectStatusService.removeProjectStatus(2, 777, 1, "DISPONENT")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
