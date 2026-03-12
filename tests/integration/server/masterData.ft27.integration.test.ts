/**
 * Test Scope:
 *
 * Feature: FT27 - Stammdatenverwaltung Produktkatalog
 * Use Case: UC27 - Admin verwaltet Kategorien, Produkte und Komponenten zentral
 *
 * Abgedeckte Regeln:
 * - FT27-Endpunkte unter /api/admin/master-data sind ADMIN-only.
 * - CRUD folgt Optimistic Locking mit VERSION_CONFLICT bei stale Version.
 * - FK-Referenzen blockieren Loeschen referenzierter Kategorien als BUSINESS_CONFLICT.
 * - Default-/Schutzkategorien (Fass Saunen plus definierte Standard-Komponentenkategorien) sind nicht loeschbar.
 * - Der Produktverwaltungs-Seed ist dateibasiert, idempotent und reaktiviert vorhandene inaktive Seed-Kategorien.
 * - Component-Product m:n-Relationen sind ersetzbar/listbar und versioniert.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann Stammdaten lesen/schreiben.
 * - Delete auf referenzierte Kategorie wird trotz Nutzung ausgefuehrt.
 *
 * Ziel:
 * API-Vertrag fuer den zentralen FT27-Stammdatenbereich integrativ absichern.
 */
import express from "express";
import { createServer } from "http";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { componentCategories, components, productCategories, products } from "@shared/schema";
import { db } from "../../../server/db";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { ensureComponentCategoryFixture, ensureProductCategoryFixture } from "../../helpers/testDataFactory";
import { getAttachmentStoragePath } from "../../../server/config/storagePaths";

let app: express.Express;
let userCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createAndLoginReaderAgent(admin: SuperAgentTest): Promise<SuperAgentTest> {
  const idx = userCounter++;
  const username = `reader-ft27-${idx}`;
  const email = `${username}@example.test`;
  await admin
    .post("/api/users")
    .send({
      username,
      email,
      firstName: "Reader",
      lastName: `FT27-${idx}`,
      roleCode: "READER",
      password: "reader-ft27-password",
    })
    .expect(201);

  const reader = request.agent(app);
  await reader
    .post("/api/auth/login")
    .send({ username, password: "reader-ft27-password" })
    .expect(200);
  return reader;
}

describe("FT27 integration: master data admin API", () => {
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

  async function writeSeedFile(fileName: string, content: string) {
    const uploadsPath = await getAttachmentStoragePath();
    const seedDirectory = path.resolve(uploadsPath, "seed");
    await mkdir(seedDirectory, { recursive: true });
    const seedPath = path.resolve(seedDirectory, fileName);
    await writeFile(seedPath, content, "utf8");
  }

  it("creates, updates and deletes a product category as admin", async () => {
    const admin = await loginAdminAgent();

    const created = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-A", isActive: true, version: 1 })
      .expect(201);

    expect(created.body.name).toBe("PK-FT27-A");
    expect(created.body.version).toBe(1);

    const updated = await admin
      .put(`/api/admin/master-data/product-categories/${created.body.id}`)
      .send({ name: "PK-FT27-A-EDIT", version: created.body.version })
      .expect(200);

    expect(updated.body.name).toBe("PK-FT27-A-EDIT");
    expect(updated.body.version).toBe(created.body.version + 1);

    await admin
      .delete(`/api/admin/master-data/product-categories/${created.body.id}`)
      .send({ version: updated.body.version })
      .expect(204);
  });

  it("returns VERSION_CONFLICT on stale update version", async () => {
    const admin = await loginAdminAgent();

    const created = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-STALE", isActive: true, version: 1 })
      .expect(201);

    await admin
      .put(`/api/admin/master-data/product-categories/${created.body.id}`)
      .send({ name: "PK-FT27-STALE-1", version: created.body.version })
      .expect(200);

    await admin
      .put(`/api/admin/master-data/product-categories/${created.body.id}`)
      .send({ name: "PK-FT27-STALE-2", version: created.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("blocks deleting referenced category with BUSINESS_CONFLICT", async () => {
    const admin = await loginAdminAgent();

    const category = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-INUSE", isActive: true, version: 1 })
      .expect(201);

    await admin
      .post("/api/admin/master-data/products")
      .send({
        name: "PRD-FT27-INUSE",
        categoryId: category.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .delete(`/api/admin/master-data/product-categories/${category.body.id}`)
      .send({ version: category.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("blocks deleting default product category with BUSINESS_CONFLICT", async () => {
    const admin = await loginAdminAgent();

    await admin
      .post("/api/admin/master-data/seed/product-management/apply")
      .send({})
      .expect(200);

    const productCategoriesResponse = await admin
      .get("/api/admin/master-data/product-categories?active=all")
      .expect(200);
    const defaultProductCategory = (productCategoriesResponse.body as Array<{ id: number; name: string; version: number }>)
      .find((row) => row.name === "Fass Saunen");

    expect(defaultProductCategory).toBeDefined();

    await admin
      .delete(`/api/admin/master-data/product-categories/${defaultProductCategory!.id}`)
      .send({ version: defaultProductCategory!.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("allows deleting legacy product category name when it is not referenced", async () => {
    const admin = await loginAdminAgent();
    const legacyCategory = await ensureProductCategoryFixture("Alle Produkte");

    await admin
      .delete(`/api/admin/master-data/product-categories/${legacyCategory.id}`)
      .send({ version: legacyCategory.version })
      .expect(204);
  });

  it.each(protectedComponentCategoryNames)(
    "blocks deleting protected component category %s with BUSINESS_CONFLICT",
    async (categoryName) => {
      const admin = await loginAdminAgent();
      const protectedCategory = await ensureComponentCategoryFixture(categoryName);

      await admin
        .delete(`/api/admin/master-data/component-categories/${protectedCategory.id}`)
        .send({ version: protectedCategory.version })
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe("BUSINESS_CONFLICT");
        });
    },
  );

  it("returns FORBIDDEN for non-admin on FT27 list endpoint", async () => {
    const admin = await loginAdminAgent();
    const reader = await createAndLoginReaderAgent(admin);

    await reader
      .get("/api/admin/master-data/product-categories?active=all")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("persists optional shortCode on product and component create update flows", async () => {
    const admin = await loginAdminAgent();
    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-SHORT", isActive: true, version: 1 })
      .expect(201);
    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-SHORT", isActive: true, version: 1 })
      .expect(201);

    const createdProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: "PRD-FT27-SHORT",
        shortCode: "PRD1",
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);
    expect(createdProduct.body.shortCode).toBe("PRD1");

    const updatedProduct = await admin
      .put(`/api/admin/master-data/products/${createdProduct.body.id}`)
      .send({
        version: createdProduct.body.version,
        shortCode: "PRD2",
      })
      .expect(200);
    expect(updatedProduct.body.shortCode).toBe("PRD2");

    const createdComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-SHORT",
        shortCode: "CMP1",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);
    expect(createdComponent.body.shortCode).toBe("CMP1");

    const updatedComponent = await admin
      .put(`/api/admin/master-data/components/${createdComponent.body.id}`)
      .send({
        version: createdComponent.body.version,
        shortCode: "CMP2",
      })
      .expect(200);
    expect(updatedComponent.body.shortCode).toBe("CMP2");
  });

  it("imports products into the selected product category idempotently", async () => {
    const admin = await loginAdminAgent();
    const category = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-IMPORT", isActive: true, version: 1 })
      .expect(201);

    const firstImport = await admin
      .post(`/api/admin/master-data/product-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("Name;Beschreibung;IsActive\nFT27 Import Produkt;Text A;\n", "utf8"), "products.csv")
      .expect(200);

    expect(firstImport.body.summary.createdRows).toBe(1);

    const secondImport = await admin
      .post(`/api/admin/master-data/product-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("Name;Beschreibung;IsActive\nFT27 Import Produkt;Text B;true\n", "utf8"), "products.csv")
      .expect(200);

    expect(secondImport.body.summary.updatedRows + secondImport.body.summary.reactivatedRows).toBe(1);

    const [importedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.name, "FT27 Import Produkt"))
      .limit(1);

    expect(importedProduct).toBeDefined();
    expect(importedProduct?.categoryId).toBe(category.body.id);
    expect(importedProduct?.description).toBe("Text B");
    expect(importedProduct?.isActive).toBe(true);
  });

  it("reactivates existing component on component category import", async () => {
    const admin = await loginAdminAgent();
    const category = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-IMPORT", isActive: true, version: 1 })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "FT27 Import Komponente",
        categoryId: category.body.id,
        description: "Alt",
        isActive: false,
        version: 1,
      })
      .expect(201);

    await db
      .update(components)
      .set({ isActive: false, version: component.body.version + 1 })
      .where(eq(components.id, component.body.id));

    const response = await admin
      .post(`/api/admin/master-data/component-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("Name;Beschreibung\nFT27 Import Komponente;Neu\n", "utf8"), "components.csv")
      .expect(200);

    expect(response.body.summary.reactivatedRows).toBe(1);

    const [refreshedComponent] = await db
      .select()
      .from(components)
      .where(eq(components.id, component.body.id))
      .limit(1);

    expect(refreshedComponent?.isActive).toBe(true);
    expect(refreshedComponent?.description).toBe("Neu");
  });

  it("returns CSV validation errors and forbids non-admin category imports", async () => {
    const admin = await loginAdminAgent();
    const category = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-IMPORT-ERR", isActive: true, version: 1 })
      .expect(201);
    const reader = await createAndLoginReaderAgent(admin);

    await admin
      .post(`/api/admin/master-data/product-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("Titel;Beschreibung\nX;Y\n", "utf8"), "products.csv")
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe("INVALID_CSV_HEADER");
      });

    await admin
      .post(`/api/admin/master-data/product-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("", "utf8"), "products.csv")
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("INVALID_CSV_CONTENT");
      });

    await reader
      .post(`/api/admin/master-data/product-categories/${category.body.id}/import-csv`)
      .attach("file", Buffer.from("Name\nX\n", "utf8"), "products.csv")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("runs the product management seed idempotently and returns log lines", async () => {
    const admin = await loginAdminAgent();
    await writeSeedFile("products.csv", "Name;Beschreibung;Kategorie\nFT27 Seed Produkt;Beschreibung A;Fass Saunen\n");
    await writeSeedFile("components.csv", "Name;Beschreibung;Kategorie\nFT27 Seed Komponente;Beschreibung B;Öfen\n");

    const firstRun = await admin
      .post("/api/admin/master-data/seed/product-management/apply")
      .send({})
      .expect(200);

    expect((firstRun.body.logLines as string[]).some((line) => line.includes("FT27 Seed Produkt"))).toBe(true);
    expect((firstRun.body.logLines as string[]).some((line) => line.includes("FT27 Seed Komponente"))).toBe(true);

    const secondRun = await admin
      .post("/api/admin/master-data/seed/product-management/apply")
      .send({})
      .expect(200);

    expect(secondRun.body.logLines).toContain("Produkt aktualisiert: FT27 Seed Produkt");
    expect(secondRun.body.logLines).toContain("Komponente aktualisiert: FT27 Seed Komponente");
  });

  it("reactivates inactive seed categories through the product management seed", async () => {
    const admin = await loginAdminAgent();
    const productCategory = await ensureProductCategoryFixture("Fass Saunen");
    const componentCategory = await ensureComponentCategoryFixture("Dachvarianten");

    await db
      .update(productCategories)
      .set({ isActive: false, version: productCategory.version + 1 })
      .where(eq(productCategories.id, productCategory.id));
    await db
      .update(componentCategories)
      .set({ isActive: false, version: componentCategory.version + 1 })
      .where(eq(componentCategories.id, componentCategory.id));

    const response = await admin
      .post("/api/admin/master-data/seed/product-management/apply")
      .send({})
      .expect(200);

    expect(response.body.logLines).toContain("Produktkategorie reaktiviert: Fass Saunen");
    expect(response.body.logLines).toContain("Komponentenkategorie reaktiviert: Dachvarianten");

    const [refreshedProductCategory] = await db
      .select({
        isActive: productCategories.isActive,
      })
      .from(productCategories)
      .where(eq(productCategories.id, productCategory.id))
      .limit(1);
    const [refreshedComponentCategory] = await db
      .select({
        isActive: componentCategories.isActive,
      })
      .from(componentCategories)
      .where(eq(componentCategories.id, componentCategory.id))
      .limit(1);

    expect(refreshedProductCategory?.isActive).toBe(true);
    expect(refreshedComponentCategory?.isActive).toBe(true);
  });

  it("returns FORBIDDEN for non-admin on product management seed endpoint", async () => {
    const admin = await loginAdminAgent();
    const reader = await createAndLoginReaderAgent(admin);

    await reader
      .post("/api/admin/master-data/seed/product-management/apply")
      .send({})
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("returns product management seed status with extra component file metadata", async () => {
    const admin = await loginAdminAgent();

    await admin
      .get("/api/admin/master-data/seed/product-management")
      .expect(200)
      .expect((res) => {
        expect(res.body.sourceFile).toBe("products.csv");
        expect(Array.isArray(res.body.extraFiles)).toBe(true);
      });
  });

  it("replaces and lists component-product relations", async () => {
    const admin = await loginAdminAgent();

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-MN", isActive: true, version: 1 })
      .expect(201);

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-MN", isActive: true, version: 1 })
      .expect(201);

    const productA = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: "PRD-FT27-MN-A",
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const productB = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: "PRD-FT27-MN-B",
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-MN",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const replaced = await admin
      .put(`/api/admin/master-data/components/${component.body.id}/products`)
      .send({ version: component.body.version, productIds: [productA.body.id, productB.body.id] })
      .expect(200);

    expect(replaced.body.id).toBe(component.body.id);
    expect(replaced.body.version).toBe(component.body.version + 1);

    await admin
      .get("/api/admin/master-data/component-products")
      .expect(200)
      .expect((res) => {
        const relatedRows = (res.body as Array<{ componentId: number; productId: number }>).filter(
          (row) => row.componentId === component.body.id,
        );
        expect(relatedRows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ componentId: component.body.id, productId: productA.body.id }),
            expect.objectContaining({ componentId: component.body.id, productId: productB.body.id }),
          ]),
        );
      });
  });

  it("returns VERSION_CONFLICT for stale component-products replace version", async () => {
    const admin = await loginAdminAgent();

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-MN-STALE", isActive: true, version: 1 })
      .expect(201);

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-MN-STALE", isActive: true, version: 1 })
      .expect(201);

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: "PRD-FT27-MN-STALE",
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-MN-STALE",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .put(`/api/admin/master-data/components/${component.body.id}/products`)
      .send({ version: component.body.version, productIds: [product.body.id] })
      .expect(200);

    await admin
      .put(`/api/admin/master-data/components/${component.body.id}/products`)
      .send({ version: component.body.version, productIds: [product.body.id] })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("returns BUSINESS_CONFLICT for invalid product reference in component-products replace", async () => {
    const admin = await loginAdminAgent();

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-MN-FK", isActive: true, version: 1 })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-MN-FK",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .put(`/api/admin/master-data/components/${component.body.id}/products`)
      .send({ version: component.body.version, productIds: [99999999] })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("returns FORBIDDEN for non-admin on component-products list endpoint", async () => {
    const admin = await loginAdminAgent();
    const reader = await createAndLoginReaderAgent(admin);

    await reader
      .get("/api/admin/master-data/component-products")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
