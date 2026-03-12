/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten / UC Projektstatus zuordnen
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf den Projektstatus-Katalog lesen und pflegen.
 * - Nicht-Admin wird auf Katalogzugriffe mit FORBIDDEN abgewiesen.
 *
 * Fehlerfaelle:
 * - Unzulaessige Rollen werden mit FORBIDDEN abgelehnt.
 *
 * Ziel:
 * Sicherstellen, dass der verbleibende Admin-only Zugriff zentral im Service durchgesetzt wird.
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
}));

import * as projectStatusRepository from "../../../server/repositories/projectStatusRepository";
import * as projectStatusService from "../../../server/services/projectStatusService";

const repoMock = vi.mocked(projectStatusRepository);

describe("PKG-15 Authorization: projectStatusService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin list access with FORBIDDEN", async () => {
    await expect(projectStatusService.listProjectStatuses("all", "DISPONENT")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(projectStatusService.listProjectStatuses("active", "LESER")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("allows ADMIN to read the requested project-status scope", async () => {
    repoMock.getProjectStatuses.mockResolvedValue([]);

    await expect(projectStatusService.listProjectStatuses("all", "ADMIN")).resolves.toEqual([]);
    expect(repoMock.getProjectStatuses).toHaveBeenCalledWith("all");
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

});
