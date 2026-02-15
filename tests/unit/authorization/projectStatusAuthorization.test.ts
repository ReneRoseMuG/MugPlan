/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten / UC Projektstatus zuordnen
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf Projektstatus-Stammdaten lesen (all/inactive), erstellen, aendern, aktivieren/deaktivieren, loeschen.
 * - DISPONENT und ADMIN duerfen Projektstatus Projekten zuordnen und entfernen.
 * - LESER darf weder Stammdatenverwaltung noch Zuordnung ausfuehren.
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

  it("rejects list(all) for DISPONENT with FORBIDDEN", async () => {
    await expect(projectStatusService.listProjectStatuses("all", "DISPONENT")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
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

  it("allows DISPONENT to add and remove relation", async () => {
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

    await projectStatusService.addProjectStatus(10, 20, 0, "DISPONENT");
    await projectStatusService.removeProjectStatus(10, 20, 1, "DISPONENT");

    expect(repoMock.addProjectStatusWithExpectedVersion).toHaveBeenCalledWith(10, 20, 0);
    expect(repoMock.removeProjectStatusWithVersion).toHaveBeenCalledWith(10, 20, 1);
  });
});
