/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kalender-Aggregation liefert strukturierte Projekt-Artikellisten fuer Termin-Previews.
 * - Historische Lesefaelle bleiben auch nach Deaktivierung von Produkt-/Komponenten-Stammdaten lesbar.
 *
 * Fehlerfaelle:
 * - Nach Deaktivierung verschwinden bestehende Artikellisten aus Termin-Previews.
 * - Kalender-Aggregation liefert keine strukturierte Artikelliste.
 *
 * Ziel:
 * Die serverseitige Kalender-Aggregation fuer Projekt-Artikellisten inkl. historischer Inaktiv-Faelle integrativ absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createProjectFixture, ensureComponentCategoryFixture } from "../../helpers/testDataFactory";
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

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const suffix = `calendar-reader-${Date.now()}-${sequence++}`;
  const username = suffix;
  const password = `${suffix}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${suffix}@local.test`,
    firstName: "Calendar",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

describe("calendar project article items integration", () => {
  it("keeps structured project article items visible after product/component deactivation", async () => {
    const admin = await loginAdminAgent();
    const reader = await createReaderAgent();
    const token = `CAL-ART-${Date.now()}-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-PROD-CAT`, isActive: true, version: 1 })
      .expect(201);

    const componentCategory = await ensureComponentCategoryFixture("Öfen");

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Modell`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Ofen`,
        categoryId: componentCategory.id,
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
        productId: product.body.id,
        componentId: null,
        specificationId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: component.body.id,
        specificationId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-01-02",
        endDate: null,
        startTime: null,
        employeeIds: [],
      })
      .expect(201);

    await admin
      .put(`/api/admin/master-data/products/${product.body.id}`)
      .send({ version: product.body.version, isActive: false })
      .expect(200);

    await admin
      .put(`/api/admin/master-data/components/${component.body.id}`)
      .send({ version: component.body.version, isActive: false })
      .expect(200);

    await reader
      .get("/api/calendar/appointments?fromDate=2099-01-01&toDate=2099-01-03&detail=full")
      .expect(200)
      .expect((res) => {
        const appointment = res.body.find((row: { projectId: number | null }) => row.projectId === project.id);
        expect(appointment).toBeDefined();
        expect(appointment.projectArticleItems).toEqual([
          { label: "Saunamodell", value: product.body.name },
          { label: "Ofen", value: component.body.name },
        ]);
      });
  });
});
