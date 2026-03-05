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
});
