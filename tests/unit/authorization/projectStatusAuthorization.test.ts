/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten / UC Projektstatus zuordnen
 *
 * Abgedeckte Regeln:
 * - Nicht-Admin sieht bei Projektstatuslisten immer nur aktive Stati (Scope-Eskalation zu active).
 * - Nur ADMIN darf Projektstatus-Stammdaten erstellen, aendern, aktivieren/deaktivieren, loeschen.
 * - Nur ADMIN darf Projektstatus Projekten zuordnen und entfernen.
 *
 * Fehlerfaelle:
 * - Unzulaessige Rollen werden mit FORBIDDEN abgelehnt.
 *
 * Ziel:
 * Sicherstellen, dass die Rollenregeln fuer FT15 zentral im Service durchgesetzt werden.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/projectStatusRepository", () => ({
  getProjectStatuses: vi.fn(),
  getProjectStatus: vi.fn(),
  createProjectStatus: vi.fn(),
  updateProjectStatusWithVersion: vi.fn(),
  toggleProjectStatusActiveWithVersion: vi.fn(),
  isProjectStatusInUse: vi.fn(),
  deleteProjectStatusWithVersion: vi.fn(),
  addProjectStatusWithExpectedVersion: vi.fn(),
  removeProjectStatusWithVersion: vi.fn(),
}));

import * as projectStatusRepository from "../../../server/repositories/projectStatusRepository";
import * as projectStatusService from "../../../server/services/projectStatusService";

const repoMock = vi.mocked(projectStatusRepository);

describe("PKG-15 Authorization: projectStatusService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forces non-admin list scope to active", async () => {
    repoMock.getProjectStatuses.mockResolvedValue([]);

    await projectStatusService.listProjectStatuses("all", "DISPONENT");
    await projectStatusService.listProjectStatuses("inactive", "LESER");
    await projectStatusService.listProjectStatuses("active", "LESER");

    expect(repoMock.getProjectStatuses).toHaveBeenNthCalledWith(1, "active");
    expect(repoMock.getProjectStatuses).toHaveBeenNthCalledWith(2, "active");
    expect(repoMock.getProjectStatuses).toHaveBeenNthCalledWith(3, "active");
  });

  it("allows LESER to read active project statuses", async () => {
    repoMock.getProjectStatuses.mockResolvedValue([]);
    await expect(projectStatusService.listProjectStatuses("active", "LESER")).resolves.toEqual([]);
    expect(repoMock.getProjectStatuses).toHaveBeenCalledWith("active");
  });

  it("rejects create for DISPONENT with FORBIDDEN", async () => {
    await expect(
      projectStatusService.createProjectStatus(
        { title: "Neu", color: "#2563eb", description: null, sortOrder: 0, isActive: true },
        "DISPONENT",
      ),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects add relation for LESER with FORBIDDEN", async () => {
    await expect(projectStatusService.addProjectStatus(10, 20, 0, "LESER")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects remove relation for DISPONENT with FORBIDDEN", async () => {
    await expect(projectStatusService.removeProjectStatus(10, 20, 1, "DISPONENT")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("allows ADMIN to add and remove relation", async () => {
    repoMock.getProjectStatus.mockResolvedValue({
      id: 20,
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
    repoMock.removeProjectStatusWithVersion.mockResolvedValue({ kind: "deleted" });

    await projectStatusService.addProjectStatus(10, 20, 0, "ADMIN");
    await projectStatusService.removeProjectStatus(10, 20, 1, "ADMIN");

    expect(repoMock.addProjectStatusWithExpectedVersion).toHaveBeenCalledWith(10, 20, 0);
    expect(repoMock.removeProjectStatusWithVersion).toHaveBeenCalledWith(10, 20, 1);
  });
});
