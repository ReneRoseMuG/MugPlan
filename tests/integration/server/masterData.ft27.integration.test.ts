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
 * - Komponenten-Loeschkonflikte liefern Referenzdetails fuer Produktzuordnungen und Projektauftragspositionen.
 * - Auch Default-Kategorien bleiben loeschbar, solange keine direkte Nutzung mehr besteht.
 * - Entfernte Legacy-Stammdatenrouten fuer Komponenten-Spezifikationen und Produktzuordnungen bleiben ungueltig.
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
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { componentCategories, components, products } from "@shared/schema";
import { db } from "../../../server/db";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createProjectFixture, ensureComponentCategoryFixture, ensureProductCategoryFixture } from "../../helpers/testDataFactory";

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

async function ensureDefaultComponentCategoryFixture(name: string) {
  const category = await ensureComponentCategoryFixture(name);

  await db
    .update(componentCategories)
    .set({
      isDefault: true,
      version: category.version + 1,
    })
    .where(eq(componentCategories.id, category.id));

  const [refreshed] = await db
    .select({
      id: componentCategories.id,
      name: componentCategories.name,
      version: componentCategories.version,
      isActive: componentCategories.isActive,
      isDefault: componentCategories.isDefault,
    })
    .from(componentCategories)
    .where(eq(componentCategories.id, category.id))
    .limit(1);

  if (!refreshed) {
    throw new Error(`Component category fixture ${name} could not be refreshed as default.`);
  }

  return refreshed;
}

describe("FT27 integration: master data admin API", () => {
  const protectedComponentCategoryNames = [
    "Dachvarianten",
    "Fenster",
    "Inneneinrichtung",
    "Ã–fen",
    "RÃ¼ckwÃ¤nde",
    "Steuerungen",
    "TÃ¼ren",
    "VorderwÃ¤nde",
  ] as const;

  it("creates, updates and deletes a product category as admin", async () => {
    const admin = await loginAdminAgent();

    const created = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: "PK-FT27-A", isDefault: false, isActive: true, version: 1 })
      .expect(201);

    expect(created.body.name).toBe("PK-FT27-A");
    expect(created.body.isDefault).toBe(false);
    expect(created.body.version).toBe(1);

    const updated = await admin
      .put(`/api/admin/master-data/product-categories/${created.body.id}`)
      .send({ name: "PK-FT27-A-EDIT", isDefault: false, version: created.body.version })
      .expect(200);

    expect(updated.body.name).toBe("PK-FT27-A-EDIT");
    expect(updated.body.isDefault).toBe(false);
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
        expect(res.body).toMatchObject({
          code: "BUSINESS_CONFLICT",
          productCount: 1,
        });
      });
  });

  it("allows deleting default product category when it is unused", async () => {
    const admin = await loginAdminAgent();
    const categoryName = `PK-FT27-DEFAULT-${Date.now()}-${userCounter++}`;
    const defaultProductCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: categoryName, isDefault: true, isActive: true, version: 1 })
      .expect(201);

    await admin
      .delete(`/api/admin/master-data/product-categories/${defaultProductCategory.body.id}`)
      .send({ version: defaultProductCategory.body.version })
      .expect(204);
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
    "allows deleting default component category %s when it is unused",
    async (categoryName) => {
      const admin = await loginAdminAgent();
      const protectedCategory = await ensureDefaultComponentCategoryFixture(categoryName);

      await admin
        .delete(`/api/admin/master-data/component-categories/${protectedCategory.id}`)
        .send({ version: protectedCategory.version })
        .expect(204);
    },
  );

  it("blocks deleting used component category with BUSINESS_CONFLICT details", async () => {
    const admin = await loginAdminAgent();

    const category = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-INUSE", isActive: true, isDefault: true, version: 1 })
      .expect(201);

    await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-INUSE",
        categoryId: category.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .delete(`/api/admin/master-data/component-categories/${category.body.id}`)
      .send({ version: category.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body).toMatchObject({
          code: "BUSINESS_CONFLICT",
          componentCount: 1,
        });
      });
  });

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

  it("returns 404 for removed legacy component specification and component-product routes", async () => {
    const admin = await loginAdminAgent();

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-LEGACY-404", isActive: true, version: 1 })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-LEGACY-404",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .get("/api/admin/master-data/component-products")
      .expect(404);

    await admin
      .put(`/api/admin/master-data/components/${component.body.id}/products`)
      .send({ version: component.body.version, productIds: [123456] })
      .expect(404);

    await admin
      .get(`/api/admin/master-data/components/${component.body.id}/specifications`)
      .expect(404);

    await admin
      .post(`/api/admin/master-data/components/${component.body.id}/specifications`)
      .send({ specName: "Leistung", specValue: "9 kW" })
      .expect(404);
  });

  it("returns detailed BUSINESS_CONFLICT counts when deleting a component used in project order items", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "FT27-CMP-DEL", name: "FT27-CMP-DEL-Project" });
    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: "CK-FT27-CMP-DEL", isActive: true, version: 1 })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: "CMP-FT27-CMP-DEL",
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: component.body.id,
        quantity: 1,
      })
      .expect(201);

    await admin
      .delete(`/api/admin/master-data/components/${component.body.id}`)
      .send({ version: component.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body).toMatchObject({
          code: "BUSINESS_CONFLICT",
          projectOrderItemCount: 1,
        });
      });
  });
});
