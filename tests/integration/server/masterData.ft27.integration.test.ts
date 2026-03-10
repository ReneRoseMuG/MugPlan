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
 * - Default-/Schutzkategorien (Alle Produkte plus definierte Standard-Komponentenkategorien) sind nicht loeschbar.
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
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { ensureComponentCategoryFixture } from "../../helpers/testDataFactory";

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

    const productCategoriesResponse = await admin
      .get("/api/admin/master-data/product-categories?active=all")
      .expect(200);
    const defaultProductCategory = (productCategoriesResponse.body as Array<{ id: number; name: string; version: number }>)
      .find((row) => row.name === "Alle Produkte");

    expect(defaultProductCategory).toBeDefined();

    await admin
      .delete(`/api/admin/master-data/product-categories/${defaultProductCategory!.id}`)
      .send({ version: defaultProductCategory!.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
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
