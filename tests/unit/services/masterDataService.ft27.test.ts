/**
 * Test Scope:
 *
 * Feature: FT27 - Stammdatenverwaltung Produktkatalog
 * Use Case: UC27 - Admin verwaltet Kategorien, Produkte und Komponenten
 *
 * Abgedeckte Regeln:
 * - Produktkategorie-Listen sind fuer Report- und Auswahlpfade lesbar, Mutationen bleiben ADMIN-only.
 * - Duplicate-/FK-Fehler werden als BUSINESS_CONFLICT gemappt.
 * - Versionskonflikte werden als VERSION_CONFLICT gemappt.
 * - Gleiche Komponentennamen sind nur innerhalb derselben Kategorie konfliktbehaftet.
 * - Produkt- und Komponentenkategorien sind loeschbar, solange sie nicht mehr verwendet werden.
 * - Komponenten-Loeschkonflikte liefern differenzierte Referenzdetails fuer Produkte und Projektauftragspositionen.
 * - Ohne Filter wird serverseitig auf active normalisiert.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann FT27-Mutationen aufrufen oder inaktive Produktkategorien lesen.
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
  getProductCategoryUsageCounts: vi.fn(),
  getProductCategoryByName: vi.fn(),
  getProductByNormalizedName: vi.fn(),
  getComponentCategoryById: vi.fn(),
  getComponentCategoryUsageCounts: vi.fn(),
  getComponentCategoryByName: vi.fn(),
  getComponentById: vi.fn(),
  getComponentDeleteRelationCounts: vi.fn(),
  getComponentByNormalizedName: vi.fn(),
  updateProductCategoryWithVersion: vi.fn(),
  updateComponentCategoryWithVersion: vi.fn(),
  updateProductWithVersion: vi.fn(),
  updateComponentWithVersion: vi.fn(),
  deleteProductCategoryWithVersion: vi.fn(),
  deleteComponentCategoryWithVersion: vi.fn(),
  deleteComponentWithVersion: vi.fn(),
  createProduct: vi.fn(),
  createComponentCategory: vi.fn(),
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  listProductCategories: repositoryMocks.listProductCategories,
  createProductCategory: repositoryMocks.createProductCategory,
  createComponent: repositoryMocks.createComponent,
  getProductCategoryById: repositoryMocks.getProductCategoryById,
  getProductCategoryUsageCounts: repositoryMocks.getProductCategoryUsageCounts,
  getProductCategoryByName: repositoryMocks.getProductCategoryByName,
  getProductByNormalizedName: repositoryMocks.getProductByNormalizedName,
  getComponentCategoryById: repositoryMocks.getComponentCategoryById,
  getComponentCategoryUsageCounts: repositoryMocks.getComponentCategoryUsageCounts,
  getComponentCategoryByName: repositoryMocks.getComponentCategoryByName,
  getComponentById: repositoryMocks.getComponentById,
  getComponentDeleteRelationCounts: repositoryMocks.getComponentDeleteRelationCounts,
  getComponentByNormalizedName: repositoryMocks.getComponentByNormalizedName,
  updateProductCategoryWithVersion: repositoryMocks.updateProductCategoryWithVersion,
  updateComponentCategoryWithVersion: repositoryMocks.updateComponentCategoryWithVersion,
  updateProductWithVersion: repositoryMocks.updateProductWithVersion,
  updateComponentWithVersion: repositoryMocks.updateComponentWithVersion,
  deleteProductCategoryWithVersion: repositoryMocks.deleteProductCategoryWithVersion,
  deleteComponentCategoryWithVersion: repositoryMocks.deleteComponentCategoryWithVersion,
  deleteComponentWithVersion: repositoryMocks.deleteComponentWithVersion,
  createProduct: repositoryMocks.createProduct,
  createComponentCategory: repositoryMocks.createComponentCategory,
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
  listProductCategories,
  MasterDataError,
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

  it("allows non-admin read access to active product categories", async () => {
    repositoryMocks.listProductCategories.mockResolvedValueOnce([]);

    await listProductCategories("all", "DISPONENT");

    expect(repositoryMocks.listProductCategories).toHaveBeenCalledWith("active");
  });

  it("normalizes undefined filter to active", async () => {
    repositoryMocks.listProductCategories.mockResolvedValueOnce([]);
    await listProductCategories(undefined, "ADMIN");
    expect(repositoryMocks.listProductCategories).toHaveBeenCalledWith("active");
  });

  it("keeps admin product category read filters intact", async () => {
    repositoryMocks.listProductCategories.mockResolvedValueOnce([]);

    await listProductCategories("all", "ADMIN");

    expect(repositoryMocks.listProductCategories).toHaveBeenCalledWith("all");
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
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 2, name: "Kategorie A", isDefault: true });
    repositoryMocks.getProductCategoryUsageCounts.mockResolvedValueOnce({ productCount: 2 });

    await expect(deleteProductCategory(2, 1, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
      details: {
        productCount: 2,
      },
    });
    expect(repositoryMocks.deleteProductCategoryWithVersion).not.toHaveBeenCalled();
  });

  it("allows deleting default product category when it is unused", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 1, name: "Fass Saunen", isDefault: true });
    repositoryMocks.getProductCategoryUsageCounts.mockResolvedValueOnce({ productCount: 0 });
    repositoryMocks.deleteProductCategoryWithVersion.mockResolvedValueOnce({ kind: "deleted" });

    await expect(deleteProductCategory(1, 3, "ADMIN")).resolves.toBeUndefined();
    expect(repositoryMocks.deleteProductCategoryWithVersion).toHaveBeenCalledWith(1, 3);
  });

  it("does not block deleting legacy category name by default protection", async () => {
    repositoryMocks.getProductCategoryById.mockResolvedValueOnce({ id: 2, name: "Alle Produkte" });
    repositoryMocks.getProductCategoryUsageCounts.mockResolvedValueOnce({ productCount: 0 });
    repositoryMocks.deleteProductCategoryWithVersion.mockResolvedValueOnce({ kind: "deleted" });

    await expect(deleteProductCategory(2, 1, "ADMIN")).resolves.toBeUndefined();
  });

  it.each(protectedComponentCategoryNames)(
    "allows deleting default component category %s when it is unused",
    async (categoryName) => {
      repositoryMocks.getComponentCategoryById.mockResolvedValueOnce({ id: 1, name: categoryName, isDefault: true });
      repositoryMocks.getComponentCategoryUsageCounts.mockResolvedValueOnce({ componentCount: 0 });
      repositoryMocks.deleteComponentCategoryWithVersion.mockResolvedValueOnce({ kind: "deleted" });

      await expect(deleteComponentCategory(1, 7, "ADMIN")).resolves.toBeUndefined();
      expect(repositoryMocks.deleteComponentCategoryWithVersion).toHaveBeenCalledWith(1, 7);
    },
  );

  it("blocks deleting component category with usage counts", async () => {
    repositoryMocks.getComponentCategoryById.mockResolvedValueOnce({ id: 7, name: "Dachvarianten", isDefault: true });
    repositoryMocks.getComponentCategoryUsageCounts.mockResolvedValueOnce({ componentCount: 3 });

    await expect(deleteComponentCategory(7, 4, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
      details: {
        componentCount: 3,
      },
    });
    expect(repositoryMocks.deleteComponentCategoryWithVersion).not.toHaveBeenCalled();
  });

  it("returns detailed BUSINESS_CONFLICT metadata when deleting a component used in project order items", async () => {
    repositoryMocks.getComponentDeleteRelationCounts.mockResolvedValueOnce({
      projectOrderItemCount: 2,
    });

    await expect(deleteComponent(17, 3, "ADMIN")).rejects.toMatchObject<Partial<MasterDataError>>({
      status: 409,
      code: "BUSINESS_CONFLICT",
      details: {
        projectOrderItemCount: 2,
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

  it("maps drizzle duplicate cause on component create to BUSINESS_CONFLICT", async () => {
    repositoryMocks.createComponent.mockRejectedValueOnce({
      message: "Failed query: insert into `components` ...",
      cause: {
        code: "ER_DUP_ENTRY",
        errno: 1062,
      },
    });

    await expect(
      createComponent(
        {
          name: "Komponente X",
          categoryId: 1,
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

});
