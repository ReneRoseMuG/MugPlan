/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Auftragspositionen sind ueber die bestehenden Projekt-Endpunkte lesbar und schreibbar.
 * - Eine neue Komponentenposition ersetzt bestehende Komponenten derselben Kategorie im Projekt.
 * - Loeschen respektiert die Version des zuletzt gespeicherten Eintrags.
 *
 * Fehlerfälle:
 * - Mehrere Komponenten derselben Kategorie bleiben parallel im Projekt bestehen.
 * - Delete ignoriert die Versionspruefung oder den Projektbezug.
 *
 * Ziel:
 * Die neue serverseitige Verdrahtung fuer `project_order_items` integrativ absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createProjectFixture } from "../../helpers/testDataFactory";

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

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

describe("FT02/FT27 integration: project order items endpoints", () => {
  it("replaces existing product-based sauna model items in the same project", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-PRODUCT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const firstProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Model-A`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const secondProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Model-B`,
        categoryId: productCategory.body.id,
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
        productId: firstProduct.body.id,
        componentId: null,
        specificationId: null,
        description: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: secondProduct.body.id,
        componentId: null,
        specificationId: null,
        description: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].productId).toBe(secondProduct.body.id);
        expect(res.body[0].componentId).toBeNull();
      });
  });

  it("replaces items in the same component category and supports list/delete", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const categoryResponse = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const firstComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component-A`,
        categoryId: categoryResponse.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const secondComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component-B`,
        categoryId: categoryResponse.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const created = await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: firstComponent.body.id,
        specificationId: null,
        description: null,
        quantity: 1,
      })
      .expect(201);

    expect(created.body.componentId).toBe(firstComponent.body.id);

    const replaced = await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: secondComponent.body.id,
        specificationId: null,
        description: null,
        quantity: 1,
      })
      .expect(201);

    const listResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].componentId).toBe(secondComponent.body.id);

    await admin
      .delete(`/api/projects/${project.id}/order-items/${replaced.body.id}`)
      .send({ version: replaced.body.version })
      .expect(204);

    await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(0);
      });
  });
});
