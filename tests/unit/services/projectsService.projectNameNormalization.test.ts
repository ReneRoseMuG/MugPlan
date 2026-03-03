/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projektnamen-Normalisierung mit Kundennummer
 *
 * Abgedeckte Regeln:
 * - createProject speichert Projektnamen immer als "K: <kundennummer> - <projektname>".
 * - updateProject normalisiert Namen bei Aenderung von name und/oder customerId.
 * - Vorhandene oder falsche Prefixe im Input werden nicht blind uebernommen.
 *
 * Fehlerfaelle:
 * - Fehlender Zielkunde bei Create/Update liefert VALIDATION_ERROR.
 *
 * Ziel:
 * Serverseitige Invariante fuer den gespeicherten Projektnamen unabhaengig vom Client-Flow absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  updateProjectWithVersionMock,
  getProjectMock,
  getCustomerMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  updateProjectWithVersionMock: vi.fn(),
  getProjectMock: vi.fn(),
  getCustomerMock: vi.fn(),
}));

vi.mock("../../../server/repositories/projectsRepository", () => ({
  createProject: createProjectMock,
  updateProjectWithVersion: updateProjectWithVersionMock,
  getProject: getProjectMock,
  getProjects: vi.fn(),
  getProjectsByCustomer: vi.fn(),
  getProjectWithCustomer: vi.fn(),
  deleteProjectWithVersion: vi.fn(),
}));

vi.mock("../../../server/repositories/customersRepository", () => ({
  getCustomer: getCustomerMock,
}));

import { createProject, ProjectsError, updateProject } from "../../../server/services/projectsService";

describe("FT02 projects service project name normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats project name on create with customer number prefix", async () => {
    getCustomerMock.mockResolvedValueOnce({ id: 11, customerNumber: "4711", isActive: true });
    createProjectMock.mockResolvedValueOnce({ id: 1, name: "K: 4711 - Sauna Modern" });

    await createProject({
      name: "Sauna Modern",
      customerId: 11,
      descriptionMd: null,
      version: 1,
    });

    expect(createProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "K: 4711 - Sauna Modern",
        customerId: 11,
      }),
    );
  });

  it("normalizes update input name against current customer number", async () => {
    getProjectMock.mockResolvedValueOnce({ id: 2, customerId: 11, name: "K: 4711 - Alt" });
    getCustomerMock.mockResolvedValueOnce({ id: 11, customerNumber: "4711", isActive: true });
    updateProjectWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      project: { id: 2, name: "K: 4711 - Neu" },
    });

    await updateProject(2, {
      version: 1,
      name: "K: 9999 - Neu",
    });

    expect(updateProjectWithVersionMock).toHaveBeenCalledWith(
      2,
      1,
      expect.objectContaining({
        name: "K: 4711 - Neu",
      }),
    );
  });

  it("rebuilds prefixed name when customer changes without explicit name update", async () => {
    getProjectMock.mockResolvedValueOnce({ id: 3, customerId: 11, name: "K: 4711 - Sauna XL" });
    getCustomerMock.mockResolvedValueOnce({ id: 12, customerNumber: "5000", isActive: true });
    updateProjectWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      project: { id: 3, name: "K: 5000 - Sauna XL" },
    });

    await updateProject(3, {
      version: 4,
      customerId: 12,
    });

    expect(updateProjectWithVersionMock).toHaveBeenCalledWith(
      3,
      4,
      expect.objectContaining({
        customerId: 12,
        name: "K: 5000 - Sauna XL",
      }),
    );
  });

  it("returns VALIDATION_ERROR when customer cannot be resolved", async () => {
    getCustomerMock.mockResolvedValueOnce(null);

    await expect(
      createProject({
        name: "Ohne Kunde",
        customerId: 99999,
        descriptionMd: null,
        version: 1,
      }),
    ).rejects.toMatchObject<Partial<ProjectsError>>({
      status: 422,
      code: "VALIDATION_ERROR",
    });

    expect(createProjectMock).not.toHaveBeenCalled();
  });
});
