/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projekt anlegen mit Pflichtfeldern
 *
 * Abgedeckte Regeln:
 * - createProject liefert VALIDATION_ERROR, wenn customerId nicht aufloesbar ist.
 * - createProject ruft Repository nicht auf, wenn der Pflichtbezug customer fehlt.
 * - Leerer Projektname wird im aktuellen IST-Verhalten als leerer Name weitergereicht.
 *
 * Fehlerfaelle:
 * - customerId fehlt/ungueltig.
 * - customerId verweist auf nicht vorhandenen Kunden.
 *
 * Ziel:
 * Pflichtfeld- und Pflichtbezug-Verhalten des Project-Service als aktueller Vertrag absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectsError } from "../../../server/services/projectsService";

const { createProjectMock, getCustomerMock } = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  getCustomerMock: vi.fn(),
}));

vi.mock("../../../server/repositories/projectsRepository", () => ({
  createProject: createProjectMock,
}));

vi.mock("../../../server/repositories/customersRepository", () => ({
  getCustomer: getCustomerMock,
}));

import { createProject } from "../../../server/services/projectsService";

describe("FT02 unit: projects service required-field behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns VALIDATION_ERROR when customerId is missing", async () => {
    getCustomerMock.mockResolvedValueOnce(null);

    await expect(
      createProject({
        customerId: undefined as unknown as number,
        name: "Projekt ohne Kunde",
        descriptionMd: null,
      } as any),
    ).rejects.toMatchObject<ProjectsError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when customerId does not exist", async () => {
    getCustomerMock.mockResolvedValueOnce(null);

    await expect(
      createProject({
        customerId: 999_999_999,
        name: "Projekt mit unbekanntem Kunden",
        descriptionMd: null,
      }),
    ).rejects.toMatchObject<ProjectsError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("documents current behavior for empty project name", async () => {
    getCustomerMock.mockResolvedValueOnce({
      id: 1,
      customerNumber: "4711",
      isActive: true,
    });
    createProjectMock.mockResolvedValueOnce({
      id: 100,
      customerId: 1,
      name: "",
    });

    await createProject({
      customerId: 1,
      name: "   ",
      descriptionMd: null,
    } as any);

    expect(createProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 1,
        name: "",
      }),
    );
  });
});
