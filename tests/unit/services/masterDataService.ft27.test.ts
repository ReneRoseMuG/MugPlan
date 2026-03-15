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
 * - Default-/Schutzkategorien (Fass Saunen plus definierte Standard-Komponentenkategorien) sind nicht loeschbar.
 * - Komponenten-Loeschkonflikte liefern differenzierte Referenzdetails fuer Produkte und Projektauftragspositionen.
 * - Der Produktverwaltungs-Seed arbeitet idempotent mit create/reactivate/skip-Logging.
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
  createComponent: vi.fn(),
  getProductCategoryById: vi.fn(),
  getProductCategoryByName: vi.fn(),
  getProductByNormalizedName: vi.fn(),
  getComponentCategoryById: vi.fn(),
  getComponentCategoryByName: vi.fn(),
  getComponentById: vi.fn(),
  getComponentDeleteRelationCounts: vi.fn(),
  getComponentByNormalizedName: vi.fn(),
  getProductsByIds: vi.fn(),
  updateProductCategoryWithVersion: vi.fn(),
  updateComponentCategoryWithVersion: vi.fn(),
  updateProductWithVersion: vi.fn(),
  updateComponentWithVersion: vi.fn(),
  deleteProductCategoryWithVersion: vi.fn(),
  deleteComponentCategoryWithVersion: vi.fn(),
  deleteComponentWithVersion: vi.fn(),
  createProduct: vi.fn(),
  createComponentCategory: vi.fn(),
  listComponentProducts: vi.fn(),
  replaceComponentProductsWithVersion: vi.fn(),
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  listProductCategories: repositoryMocks.listProductCategories,
  createProductCategory: repositoryMocks.createProductCategory,
  createComponent: repositoryMocks.createComponent,
  getProductCategoryById: repositoryMocks.getProductCategoryById,
  getProductCategoryByName: repositoryMocks.getProductCategoryByName,
  getProductByNormalizedName: repositoryMocks.getProductByNormalizedName,
  getComponentCategoryById: repositoryMocks.getComponentCategoryById,
  getComponentCategoryByName: repositoryMocks.getComponentCategoryByName,
  getComponentById: repositoryMocks.getComponentById,
  getComponentDeleteRelationCounts: repositoryMocks.getComponentDeleteRelationCounts,
  getComponentByNormalizedName: repositoryMocks.getComponentByNormalizedName,
  getProductsByIds: repositoryMocks.getProductsByIds,
  updateProductCategoryWithVersion: repositoryMocks.updateProductCategoryWithVersion,
  updateComponentCategoryWithVersion: repositoryMocks.updateComponentCategoryWithVersion,
  updateProductWithVersion: repositoryMocks.updateProductWithVersion,
  updateComponentWithVersion: repositoryMocks.updateComponentWithVersion,
  deleteProductCategoryWithVersion: repositoryMocks.deleteProductCategoryWithVersion,
  deleteComponentCategoryWithVersion: repositoryMocks.deleteComponentCategoryWithVersion,
  deleteComponentWithVersion: repositoryMocks.deleteComponentWithVersion,
  createProduct: repositoryMocks.createProduct,
  createComponentCategory: repositoryMocks.createComponentCategory,
  listComponentProducts: repositoryMocks.listComponentProducts,
  replaceComponentProductsWithVersion: repositoryMocks.replaceComponentProductsWithVersion,
}));

import {
  createComponent,
  createProduct,
  createProductCategory,
  deleteComponent,
  deleteComponentCategory,
  deleteProductCategory,
  importComponentsForCategory,
  importProductsForCategory,
  listComponentProducts,
  listProductCategories,
  MasterDataError,
  replaceComponentProducts,
  runProductManagementSeed,
  updateProduct,
} from "../../../server/services/masterDataService";

describe("FT27 unit: masterDataService", () => {
  const protectedComponentCategoryNames = [
    "Dachvarianten",
    "Fenster",
    "Inneneinrichtung",
    "Öfen",
    "Rückwände",
    "Steuerungen",
    "Türen",
    "Vorderwände",
  ] as const;

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
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 2, name: "Kategorie A" });
    repositoryMocks.deleteProductCategoryWithVersion.mockRejectedValueOnce({
      code: "ER_ROW_IS_REFERENCED_2",
      errno: 1451,
    });

    await expect(deleteProductCategory(2, 1, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("blocks deleting default product category as BUSINESS_CONFLICT", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 1, name: "Fass Saunen" });

    await expect(deleteProductCategory(1, 3, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
    expect(repositoryMocks.deleteProductCategoryWithVersion).not.toHaveBeenCalled();
  });

  it("does not block deleting legacy category name by default protection", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 2, name: "Alle Produkte" });
    repositoryMocks.deleteProductCategoryWithVersion.mockResolvedValueOnce({ kind: "deleted" });

    await expect(deleteProductCategory(2, 1, "ADMIN")).resolves.toBeUndefined();
  });

  it.each(protectedComponentCategoryNames)(
    "blocks deleting protected component category %s as BUSINESS_CONFLICT",
    async (categoryName) => {
      repositoryMocks.getComponentCategoryById.mockResolvedValueOnce({ id: 1, name: categoryName });

      await expect(deleteComponentCategory(1, 7, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
        status: 409,
        code: "BUSINESS_CONFLICT",
      });
      expect(repositoryMocks.deleteComponentCategoryWithVersion).not.toHaveBeenCalled();
    },
  );

  it("returns detailed BUSINESS_CONFLICT metadata when deleting a component assigned to products", async () => {
    repositoryMocks.getComponentDeleteRelationCounts.mockResolvedValueOnce({
      assignedProductCount: 2,
      projectOrderItemCount: 0,
    });

    await expect(deleteComponent(17, 3, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
      details: {
        assignedProductCount: 2,
        projectOrderItemCount: 0,
      },
    });
    expect(repositoryMocks.deleteComponentWithVersion).not.toHaveBeenCalled();
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

  it("normalizes empty or trimmed shortCode values before persisting", async () => {
    repositoryMocks.createProduct.mockResolvedValueOnce({ id: 10, shortCode: "PX", version: 1 });
    repositoryMocks.createComponent.mockResolvedValueOnce({ id: 11, shortCode: null, version: 1 });

    await createProduct(
      {
        name: "Produkt X",
        shortCode: "  PX  ",
        categoryId: 1,
        description: null,
        isActive: true,
        version: 1,
      },
      "ADMIN",
    );
    await createComponent(
      {
        name: "Komponente X",
        shortCode: "   ",
        categoryId: 1,
        description: null,
        isActive: true,
        version: 1,
      },
      "ADMIN",
    );

    expect(repositoryMocks.createProduct).toHaveBeenCalledWith(expect.objectContaining({ shortCode: "PX" }));
    expect(repositoryMocks.createComponent).toHaveBeenCalledWith(expect.objectContaining({ shortCode: null }));
  });

  it("maps non-admin access for component-products list to FORBIDDEN", async () => {
    await expect(listComponentProducts("LESER")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(repositoryMocks.listComponentProducts).not.toHaveBeenCalled();
  });

  it("maps component-products version conflict to VERSION_CONFLICT", async () => {
    repositoryMocks.getComponentById.mockResolvedValueOnce({ id: 5, isActive: true });
    repositoryMocks.getProductsByIds.mockResolvedValueOnce([{ id: 1, isActive: true }, { id: 2, isActive: true }]);
    repositoryMocks.replaceComponentProductsWithVersion.mockResolvedValueOnce({
      kind: "version_conflict",
    });

    await expect(replaceComponentProducts(5, 2, [1, 2], "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });

  it("maps component-products missing FK to BUSINESS_CONFLICT", async () => {
    repositoryMocks.getComponentById.mockResolvedValueOnce({ id: 5, isActive: true });
    repositoryMocks.getProductsByIds.mockResolvedValueOnce([{ id: 999999, isActive: true }]);
    repositoryMocks.replaceComponentProductsWithVersion.mockRejectedValueOnce({
      code: "ER_NO_REFERENCED_ROW_2",
      errno: 1452,
    });

    await expect(replaceComponentProducts(5, 2, [999999], "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
    });
  });

  it("imports products for a category with create update reactivate and defaults", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 3, name: "Kategorie A", version: 1, isActive: true });
    repositoryMocks.getProductByNormalizedName
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 10, name: "Bestand", categoryId: 2, description: "Alt", isActive: true, version: 4 })
      .mockResolvedValueOnce({ id: 11, name: "Schlafend", categoryId: 2, description: "Alt", isActive: false, version: 7 });
    repositoryMocks.createProduct.mockResolvedValueOnce({ id: 20 });
    repositoryMocks.updateProductWithVersion
      .mockResolvedValueOnce({ kind: "updated", row: { id: 10 } })
      .mockResolvedValueOnce({ kind: "updated", row: { id: 11 } });

    const csv = Buffer.from("Name;Beschreibung;IsActive\nNeu;Text;\nBestand;;true\nSchlafend;;\n", "utf8");
    const result = await importProductsForCategory(3, csv, "ADMIN");

    expect(repositoryMocks.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: "Neu",
      categoryId: 3,
      description: "Text",
      shortCode: null,
      isActive: true,
      version: 1,
    }));
    expect(repositoryMocks.updateProductWithVersion).toHaveBeenNthCalledWith(1, 10, 4, {
      name: "Bestand",
      categoryId: 3,
      description: null,
      shortCode: null,
      isActive: true,
    });
    expect(repositoryMocks.updateProductWithVersion).toHaveBeenNthCalledWith(2, 11, 7, {
      name: "Schlafend",
      categoryId: 3,
      description: null,
      shortCode: null,
      isActive: true,
    });
    expect(result.summary.createdRows).toBe(1);
    expect(result.summary.updatedRows).toBe(1);
    expect(result.summary.reactivatedRows).toBe(1);
    expect(result.summary.invalidRows).toBe(0);
  });

  it("rejects product import without Name header", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 3, name: "Kategorie A", version: 1, isActive: true });

    await expect(importProductsForCategory(3, Buffer.from("Titel;Beschreibung\nX;Y\n", "utf8"), "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 400,
      code: "INVALID_CSV_HEADER",
    });
  });

  it("rejects component import for missing category", async () => {
    repositoryMocks.getComponentCategoryById.mockResolvedValueOnce(undefined);

    await expect(importComponentsForCategory(99, Buffer.from("Name\nX\n", "utf8"), "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("imports components idempotently and marks duplicate rows inside csv as invalid", async () => {
    repositoryMocks.getComponentCategoryById.mockResolvedValueOnce({ id: 6, name: "Komponenten A", version: 1, isActive: true });
    repositoryMocks.getComponentByNormalizedName
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 31, name: "Vorhanden", categoryId: 1, description: null, isActive: true, version: 5 });
    repositoryMocks.createComponent.mockResolvedValueOnce({ id: 30 });
    repositoryMocks.updateComponentWithVersion.mockResolvedValueOnce({ kind: "updated", row: { id: 31 } });

    const csv = Buffer.from("Name,Beschreibung,IsActive\nNeu,Info,true\nVorhanden,,true\nneu,,true\n", "utf8");
    const result = await importComponentsForCategory(6, csv, "ADMIN");

    expect(result.summary.createdRows).toBe(1);
    expect(result.summary.updatedRows).toBe(1);
    expect(result.summary.invalidRows).toBe(1);
    expect(result.rows.find((row) => row.lineNumber === 4)?.message).toContain("Duplikat");
  });

  it("accepts single-column Name csv for component import", async () => {
    repositoryMocks.getComponentCategoryById.mockResolvedValueOnce({ id: 6, name: "Komponenten A", version: 1, isActive: true });
    repositoryMocks.getComponentByNormalizedName.mockResolvedValueOnce(undefined);
    repositoryMocks.createComponent.mockResolvedValueOnce({ id: 30 });

    const csv = Buffer.from("Name\nNur Dach\n", "utf8");
    const result = await importComponentsForCategory(6, csv, "ADMIN");

    expect(repositoryMocks.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      name: "Nur Dach",
      categoryId: 6,
      description: null,
      shortCode: null,
      isActive: true,
      version: 1,
    }));
    expect(result.summary.createdRows).toBe(1);
    expect(result.summary.invalidRows).toBe(0);
  });

  it("creates missing seed categories and logs the actions", async () => {
    repositoryMocks.getProductCategoryByName.mockResolvedValueOnce(undefined);
    repositoryMocks.createProductCategory.mockResolvedValueOnce({ id: 10, name: "Fass Saunen", isActive: true, version: 1 });
    for (let index = 0; index < protectedComponentCategoryNames.length; index += 1) {
      repositoryMocks.getComponentCategoryByName.mockResolvedValueOnce(undefined);
      repositoryMocks.createComponentCategory.mockResolvedValueOnce({
        id: 100 + index,
        name: protectedComponentCategoryNames[index],
        isActive: true,
        version: 1,
      });
    }

    const result = await runProductManagementSeed("ADMIN");

    expect(result.logLines).toContain("Produktkategorie angelegt: Fass Saunen");
    expect(result.logLines).toContain("Komponentenkategorie angelegt: Dachvarianten");
    expect(repositoryMocks.createProductCategory).toHaveBeenCalledWith({ name: "Fass Saunen", isActive: true, version: 1 });
    expect(repositoryMocks.createComponentCategory).toHaveBeenCalledTimes(protectedComponentCategoryNames.length);
  });

  it("reactivates inactive seed categories and logs the actions", async () => {
    repositoryMocks.getProductCategoryByName.mockResolvedValueOnce({ id: 7, name: "Fass Saunen", isActive: false, version: 4 });
    repositoryMocks.updateProductCategoryWithVersion.mockResolvedValueOnce({ kind: "updated", row: { id: 7 } });
    repositoryMocks.getComponentCategoryByName
      .mockResolvedValueOnce({ id: 11, name: "Dachvarianten", isActive: false, version: 2 })
      .mockResolvedValueOnce({ id: 12, name: "Fenster", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 13, name: "Inneneinrichtung", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 14, name: "Öfen", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 15, name: "Rückwände", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 16, name: "Steuerungen", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 17, name: "Türen", isActive: true, version: 1 })
      .mockResolvedValueOnce({ id: 18, name: "Vorderwände", isActive: true, version: 1 });
    repositoryMocks.updateComponentCategoryWithVersion.mockResolvedValueOnce({ kind: "updated", row: { id: 11 } });

    const result = await runProductManagementSeed("ADMIN");

    expect(result.logLines).toContain("Produktkategorie reaktiviert: Fass Saunen");
    expect(result.logLines).toContain("Komponentenkategorie reaktiviert: Dachvarianten");
    expect(result.logLines).toContain("Komponentenkategorie bereits vorhanden: Fenster");
    expect(repositoryMocks.updateProductCategoryWithVersion).toHaveBeenCalledWith(7, 4, { isActive: true });
    expect(repositoryMocks.updateComponentCategoryWithVersion).toHaveBeenCalledWith(11, 2, { isActive: true });
  });
});
