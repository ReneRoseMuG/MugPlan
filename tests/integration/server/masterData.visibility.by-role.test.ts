/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ADMIN erhaelt aktive und inaktive Produkte, Komponenten und Komponentenkategorien.
 * - DISPONENT und LESER erhalten in den Read-Endpunkten nur aktive Produkte, Komponenten und Komponentenkategorien.
 * - Neue Produkte und Komponenten sind standardmaessig aktiv, wenn `isActive` nicht explizit gesetzt wird.
 *
 * Fehlerfaelle:
 * - Nicht-Admin bekommt inaktive Stammdaten ueber Read-Endpunkte ausgeliefert.
 * - Neue Produkte oder Komponenten starten unbeabsichtigt inaktiv.
 *
 * Ziel:
 * Die rollenabhaengige Sichtbarkeit und die Aktiv-Defaults im Masterdata-Bereich integrativ absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let sequence = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(() => {
  sequence = 1;
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const suffix = `${roleCode.toLowerCase()}-${Date.now()}-${sequence++}`;
  const username = `masterdata-${suffix}`;
  const password = `masterdata-${suffix}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${suffix}@local.test`,
    firstName: "Role",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function seedVisibilityFixture(admin: SuperAgentTest) {
  const token = `FT27-VIS-${Date.now()}-${sequence++}`;

  const activeComponentCategory = await admin
    .post("/api/admin/master-data/component-categories")
    .send({ name: `${token}-COMP-A`, isActive: true, version: 1 })
    .expect(201);

  const inactiveComponentCategory = await admin
    .post("/api/admin/master-data/component-categories")
    .send({ name: `${token}-COMP-I`, isActive: false, version: 1 })
    .expect(201);

  const productCategory = await admin
    .post("/api/admin/master-data/product-categories")
    .send({ name: `${token}-PROD-CAT`, isActive: true, version: 1 })
    .expect(201);

  const activeProduct = await admin
    .post("/api/admin/master-data/products")
    .send({
      name: `${token}-PROD-A`,
      categoryId: productCategory.body.id,
      description: null,
      isActive: true,
      version: 1,
    })
    .expect(201);

  const inactiveProduct = await admin
    .post("/api/admin/master-data/products")
    .send({
      name: `${token}-PROD-I`,
      categoryId: productCategory.body.id,
      description: null,
      isActive: false,
      version: 1,
    })
    .expect(201);

  const activeComponent = await admin
    .post("/api/admin/master-data/components")
    .send({
      name: `${token}-COMPONENT-A`,
      categoryId: activeComponentCategory.body.id,
      description: null,
      isActive: true,
      version: 1,
    })
    .expect(201);

  const inactiveComponent = await admin
    .post("/api/admin/master-data/components")
    .send({
      name: `${token}-COMPONENT-I`,
      categoryId: activeComponentCategory.body.id,
      description: null,
      isActive: false,
      version: 1,
    })
    .expect(201);

  return {
    activeComponentCategory: activeComponentCategory.body,
    inactiveComponentCategory: inactiveComponentCategory.body,
    activeProduct: activeProduct.body,
    inactiveProduct: inactiveProduct.body,
    activeComponent: activeComponent.body,
    inactiveComponent: inactiveComponent.body,
  };
}

describe("FT27 integration: master data visibility by role", () => {
  it("returns active and inactive products/components/categories for admin", async () => {
    const admin = await loginAdminAgent();
    const fixture = await seedVisibilityFixture(admin);

    await admin
      .get("/api/admin/master-data/products?active=all")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((row: { id: number }) => row.id);
        expect(ids).toContain(fixture.activeProduct.id);
        expect(ids).toContain(fixture.inactiveProduct.id);
      });

    await admin
      .get("/api/admin/master-data/components?active=all")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((row: { id: number }) => row.id);
        expect(ids).toContain(fixture.activeComponent.id);
        expect(ids).toContain(fixture.inactiveComponent.id);
      });

    await admin
      .get("/api/admin/master-data/component-categories?active=all")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((row: { id: number }) => row.id);
        expect(ids).toContain(fixture.activeComponentCategory.id);
        expect(ids).toContain(fixture.inactiveComponentCategory.id);
      });
  });

  it.each(["DISPATCHER", "READER"] as const)(
    "filters inactive master data for %s read endpoints",
    async (roleCode) => {
      const admin = await loginAdminAgent();
      const fixture = await seedVisibilityFixture(admin);
      const agent = await createRoleAgent(roleCode);

      await agent
        .get("/api/admin/master-data/products?active=all")
        .expect(200)
        .expect((res) => {
          const ids = res.body.map((row: { id: number }) => row.id);
          expect(ids).toContain(fixture.activeProduct.id);
          expect(ids).not.toContain(fixture.inactiveProduct.id);
        });

      await agent
        .get("/api/admin/master-data/components?active=inactive")
        .expect(200)
        .expect((res) => {
          const ids = res.body.map((row: { id: number }) => row.id);
          expect(ids).toContain(fixture.activeComponent.id);
          expect(ids).not.toContain(fixture.inactiveComponent.id);
        });

      await agent
        .get("/api/admin/master-data/component-categories?active=all")
        .expect(200)
        .expect((res) => {
          const ids = res.body.map((row: { id: number }) => row.id);
          expect(ids).toContain(fixture.activeComponentCategory.id);
          expect(ids).not.toContain(fixture.inactiveComponentCategory.id);
        });
    },
  );

  it("defaults new products and components to active when isActive is omitted", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-DEFAULT-${Date.now()}-${sequence++}`;

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-PROD-CAT`, version: 1 })
      .expect(201);

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: `${token}-COMP-CAT`, version: 1 })
      .expect(201);

    await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-PROD`,
        categoryId: productCategory.body.id,
        description: null,
        version: 1,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isActive).toBe(true);
      });

    await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-COMP`,
        categoryId: componentCategory.body.id,
        description: null,
        version: 1,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isActive).toBe(true);
      });
  });
});
