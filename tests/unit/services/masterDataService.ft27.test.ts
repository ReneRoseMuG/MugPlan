/**
 * Test Scope:
 *
 * Feature: FT27 - Stammdatenverwaltung Produktkatalog
 * Use Case: UC27 - Admin verwaltet Kategorien, Produkte und Komponenten
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf FT27-Stammdatenoperationen ausfuehren.
 * - Duplicate-/FK-Fehler werden als BUSINESS_CONFLICT gemappt.
 * - Versionskonflikte werden als VERSION_CONFLICT gemappt.
 * - Component-Product m:n-Operationen folgen derselben Fehlersemantik.
 * - Ohne Filter wird serverseitig auf active normalisiert.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann FT27-Endpunkte aufrufen.
 * - DB-Fehlercodes werden inkonsistent nach oben gegeben.
 *
 * Ziel:
 * Service-Vertrag und Fehlerabbildung fuer FT27 deterministisch absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  listProductCategories: vi.fn(),
  createProductCategory: vi.fn(),
  updateProductWithVersion: vi.fn(),
  deleteProductCategoryWithVersion: vi.fn(),
  createProduct: vi.fn(),
  listComponentProducts: vi.fn(),
  replaceComponentProductsWithVersion: vi.fn(),
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  listProductCategories: repositoryMocks.listProductCategories,
  createProductCategory: repositoryMocks.createProductCategory,
  updateProductWithVersion: repositoryMocks.updateProductWithVersion,
  deleteProductCategoryWithVersion: repositoryMocks.deleteProductCategoryWithVersion,
  createProduct: repositoryMocks.createProduct,
  listComponentProducts: repositoryMocks.listComponentProducts,
  replaceComponentProductsWithVersion: repositoryMocks.replaceComponentProductsWithVersion,
}));

import {
  createProduct,
  createProductCategory,
  deleteProductCategory,
  listComponentProducts,
  listProductCategories,
  MasterDataError,
  replaceComponentProducts,
  updateProduct,
} from "../../../server/services/masterDataService";

describe("FT27 unit: masterDataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-admin access with FORBIDDEN", async () => {
    await expect(listProductCategories(undefined, "DISPONENT")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(repositoryMocks.listProductCategories).not.toHaveBeenCalled();
  });

  it("normalizes undefined filter to active", async () => {
    repositoryMocks.listProductCategories.mockResolvedValueOnce([]);
    await listProductCategories(undefined, "ADMIN");
    expect(repositoryMocks.listProductCategories).toHaveBeenCalledWith("active");
  });

  it("maps duplicate category create to BUSINESS_CONFLICT", async () => {
    repositoryMocks.createProductCategory.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });

    await expect(
      createProductCategory(
        { name: "Kategorie A", isActive: true, version: 1 },
        "ADMIN",
      ),
    ).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("maps product update version conflict to VERSION_CONFLICT", async () => {
    repositoryMocks.updateProductWithVersion.mockResolvedValueOnce({
      kind: "version_conflict",
    });

    await expect(
      updateProduct(
        11,
        4,
        { name: "P-11", categoryId: 1 },
        "ADMIN",
      ),
    ).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps referenced category delete to BUSINESS_CONFLICT", async () => {
    repositoryMocks.deleteProductCategoryWithVersion.mockRejectedValueOnce({
      code: "ER_ROW_IS_REFERENCED_2",
      errno: 1451,
    });

    await expect(deleteProductCategory(2, 1, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("maps product create FK conflict to BUSINESS_CONFLICT", async () => {
    repositoryMocks.createProduct.mockRejectedValueOnce({
      code: "ER_ROW_IS_REFERENCED_2",
      errno: 1451,
    });

    await expect(
      createProduct(
        {
          name: "Produkt X",
          categoryId: 999,
          description: null,
          isActive: true,
          version: 1,
        },
        "ADMIN",
      ),
    ).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("maps non-admin access for component-products list to FORBIDDEN", async () => {
    await expect(listComponentProducts("LESER")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(repositoryMocks.listComponentProducts).not.toHaveBeenCalled();
  });

  it("maps component-products version conflict to VERSION_CONFLICT", async () => {
    repositoryMocks.replaceComponentProductsWithVersion.mockResolvedValueOnce({
      kind: "version_conflict",
    });

    await expect(replaceComponentProducts(5, 2, [1, 2], "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps component-products missing FK to BUSINESS_CONFLICT", async () => {
    repositoryMocks.replaceComponentProductsWithVersion.mockRejectedValueOnce({
      code: "ER_NO_REFERENCED_ROW_2",
      errno: 1452,
    });

    await expect(replaceComponentProducts(5, 2, [999999], "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });
});
