/**
 * Test Scope:
 *
 * Feature: FT28 - Tag Verwaltung im Admin-Bereich
 * Use Case: UC28 - Admin verwaltet Tags zentral in Stammdaten
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf Tag-Endpunkte lesen und mutieren.
 * - Tag-Erstellung erzwingt isDefault=false.
 * - Tag-Loeschung ist nur ohne Relationen zulaessig.
 * - Duplicate-/Versionskonflikte werden deterministisch gemappt.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann Tag-Endpunkte aufrufen.
 * - Tags mit Relationen werden trotz Belegung geloescht.
 *
 * Ziel:
 * Service-Vertrag fuer FT28-Tagverwaltung inkl. Rollen- und Loeschregeln absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  updateTagWithVersion: vi.fn(),
  deleteTagWithVersion: vi.fn(),
  getTagRelationCounts: vi.fn(),
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  listTags: repositoryMocks.listTags,
  createTag: repositoryMocks.createTag,
  updateTagWithVersion: repositoryMocks.updateTagWithVersion,
  deleteTagWithVersion: repositoryMocks.deleteTagWithVersion,
  getTagRelationCounts: repositoryMocks.getTagRelationCounts,
}));

import {
  createTag,
  deleteTag,
  listTags,
  MasterDataError,
  updateTag,
} from "../../../server/services/masterDataService";

describe("FT28 unit: masterDataService tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-admin access with FORBIDDEN", async () => {
    await expect(listTags("DISPONENT")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(repositoryMocks.listTags).not.toHaveBeenCalled();
  });

  it("creates tags with isDefault=false", async () => {
    repositoryMocks.createTag.mockResolvedValueOnce({
      id: 10,
      name: "Tag-A",
      color: "#112233",
      isDefault: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createTag({ name: "Tag-A", color: "#112233" }, "ADMIN");

    expect(repositoryMocks.createTag).toHaveBeenCalledWith({
      name: "Tag-A",
      color: "#112233",
    });
  });

  it("maps duplicate create to BUSINESS_CONFLICT", async () => {
    repositoryMocks.createTag.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });

    await expect(createTag({ name: "Tag-DUP", color: "#445566" }, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("blocks delete when relations exist", async () => {
    repositoryMocks.getTagRelationCounts.mockResolvedValueOnce({
      projectCount: 1,
      customerCount: 0,
      employeeCount: 0,
      appointmentCount: 0,
    });

    await expect(deleteTag(7, 3, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.deleteTagWithVersion).not.toHaveBeenCalled();
  });

  it("maps delete version conflict to VERSION_CONFLICT", async () => {
    repositoryMocks.getTagRelationCounts.mockResolvedValueOnce({
      projectCount: 0,
      customerCount: 0,
      employeeCount: 0,
      appointmentCount: 0,
    });
    repositoryMocks.deleteTagWithVersion.mockResolvedValueOnce({ kind: "version_conflict" });

    await expect(deleteTag(8, 2, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps duplicate update to BUSINESS_CONFLICT", async () => {
    repositoryMocks.updateTagWithVersion.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });

    await expect(updateTag(9, 1, { name: "Tag-X" }, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });
});

