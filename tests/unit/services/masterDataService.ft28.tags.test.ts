/**
 * Test Scope:
 *
 * Feature: FT28 - Tag Verwaltung im Admin-Bereich
 * Use Case: UC28 - Admin verwaltet Tags zentral in Stammdaten
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf Tag-Endpunkte lesen und mutieren.
 * - Tag-Erstellung erzwingt fuer manuelle Tags weiterhin isDefault=false.
 * - System-Tags werden ueber isDefault serverseitig geschuetzt und bei Bedarf nachgezogen.
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
  getTagById: vi.fn(),
  ensureTagDefinition: vi.fn(),
  updateTagWithVersion: vi.fn(),
  deleteTagWithVersion: vi.fn(),
  getTagRelationCounts: vi.fn(),
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  listTags: repositoryMocks.listTags,
  createTag: repositoryMocks.createTag,
  getTagById: repositoryMocks.getTagById,
  ensureTagDefinition: repositoryMocks.ensureTagDefinition,
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

  it("ensures both protected system tags before listing tags", async () => {
    repositoryMocks.listTags.mockResolvedValueOnce([]);

    await listTags("ADMIN");

    expect(repositoryMocks.ensureTagDefinition).toHaveBeenCalledWith({
      name: "Storniert",
      color: "#ef4444",
      isDefault: true,
    });
    expect(repositoryMocks.ensureTagDefinition).toHaveBeenCalledWith({
      name: "Reklamation",
      color: "#f97316",
      isDefault: true,
    });
    expect(repositoryMocks.listTags).toHaveBeenCalledOnce();
  });

  it("creates tags with isDefault=false", async () => {
    repositoryMocks.ensureTagDefinition.mockResolvedValueOnce({
      id: 98,
      name: "Storniert",
      color: "#ef4444",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repositoryMocks.ensureTagDefinition.mockResolvedValueOnce({
      id: 99,
      name: "Reklamation",
      color: "#f97316",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    repositoryMocks.ensureTagDefinition.mockResolvedValueOnce({
      id: 98,
      name: "Storniert",
      color: "#ef4444",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repositoryMocks.ensureTagDefinition.mockResolvedValueOnce({
      id: 99,
      name: "Reklamation",
      color: "#f97316",
      isDefault: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 7,
      name: "Tag-In-Use",
    });
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
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 8,
      name: "Tag-Delete",
    });
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
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 9,
      name: "Tag-X",
    });
    repositoryMocks.updateTagWithVersion.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });

    await expect(updateTag(9, 1, { name: "Tag-X" }, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("blocks updating the reserved cancellation tag", async () => {
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 10,
      name: "Storniert",
      isDefault: true,
    });

    await expect(updateTag(10, 1, { name: "Neu" }, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.updateTagWithVersion).not.toHaveBeenCalled();
  });

  it("blocks deleting the reserved cancellation tag", async () => {
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 11,
      name: "Storniert",
      isDefault: true,
    });

    await expect(deleteTag(11, 1, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.deleteTagWithVersion).not.toHaveBeenCalled();
  });

  it("blocks updating the managed report exclusion tag", async () => {
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 12,
      name: "Reklamation",
      isDefault: true,
    });

    await expect(updateTag(12, 1, { name: "Neu" }, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.updateTagWithVersion).not.toHaveBeenCalled();
  });

  it("blocks deleting the managed report exclusion tag", async () => {
    repositoryMocks.getTagById.mockResolvedValueOnce({
      id: 13,
      name: "Reklamation",
      isDefault: true,
    });

    await expect(deleteTag(13, 1, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.deleteTagWithVersion).not.toHaveBeenCalled();
  });

  it("ensures the reserved cancellation tag with managed color and isDefault", async () => {
    repositoryMocks.listTags.mockResolvedValueOnce([]);

    await listTags("ADMIN");

    expect(repositoryMocks.ensureTagDefinition).toHaveBeenCalledWith({
      name: "Storniert",
      color: "#ef4444",
      isDefault: true,
    });
  });
});
