/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projektnamen-Speicherung ohne Kundennummer-Praefix
 *
 * Abgedeckte Regeln:
 * - createProject speichert den fachlichen Projektnamen direkt (getrimmt).
 * - updateProject trimmt Namen bei expliziter Namensaenderung.
 * - updateProject aendert den Namen nicht implizit bei reinem customerId-Wechsel.
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

  it("persists plain project name on create", async () => {
    getCustomerMock.mockResolvedValueOnce({ id: 11, customerNumber: "4711", isActive: true });
    createProjectMock.mockResolvedValueOnce({ id: 1, name: "Sauna Modern" });

    await createProject({
      name: "  Sauna Modern  ",
      customerId: 11,
      descriptionMd: null,
      version: 1,
    });

    expect(createProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sauna Modern",
        customerId: 11,
      }),
    );
  });

  it("trims name on explicit update", async () => {
    updateProjectWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      project: { id: 2, name: "Neu" },
    });

    await updateProject(2, {
      version: 1,
      name: "  Neu  ",
    });

    expect(updateProjectWithVersionMock).toHaveBeenCalledWith(
      2,
      1,
      expect.objectContaining({
        name: "Neu",
      }),
    );
  });

  it("keeps name unchanged when only customer changes", async () => {
    getProjectMock.mockResolvedValueOnce({ id: 3, customerId: 11, name: "Sauna XL" });
    getCustomerMock.mockResolvedValueOnce({ id: 12, customerNumber: "5000", isActive: true });
    updateProjectWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      project: { id: 3, name: "Sauna XL" },
    });

    await updateProject(3, {
      version: 4,
      customerId: 12,
    });

    expect(updateProjectWithVersionMock).toHaveBeenCalledWith(
      3,
      4,
      expect.objectContaining({ customerId: 12 }),
    );
    expect(updateProjectWithVersionMock).not.toHaveBeenCalledWith(
      3,
      4,
      expect.objectContaining({ name: expect.any(String) }),
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
